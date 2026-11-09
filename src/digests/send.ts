import { pool } from "supabase/pool";
import { loadDigestActivity } from "./activity";
import { digestMessage } from "./message";
import { Err, Ok } from "src/result";
import { z } from "zod";

export async function sendDigest(args: {
  identity: string;
  ownerDid: string;
  publication: string;
  email: string;
  apiKey: string;
}) {
  const db = await pool.connect();
  let period: { start: string; end: string };
  let message: ReturnType<typeof digestMessage>;
  try {
    await db.query("BEGIN");
    const { rows: locks } = await db.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired",
      [`digest:${args.identity}:${args.publication}`],
    );
    if (!locks[0].acquired) {
      await db.query("ROLLBACK");
      return Err("already_sending" as const);
    }
    const { rows: publications } = await db.query<{ name: string }>(
      "SELECT name FROM publications WHERE uri = $1 AND identity_did = $2",
      [args.publication, args.ownerDid],
    );
    if (!publications[0]) {
      await db.query("ROLLBACK");
      return Err("unauthorized" as const);
    }
    const { rows: pending } = await db.query(
      "SELECT 1 FROM notification_digests WHERE identity = $1 AND publication = $2 AND status = 'pending' LIMIT 1",
      [args.identity, args.publication],
    );
    if (pending.length) {
      await db.query("ROLLBACK");
      return Err("delivery_pending" as const);
    }
    const { rows: previous } = await db.query<{ period_end: Date }>(
      "SELECT period_end FROM notification_digests WHERE identity = $1 AND publication = $2 AND status = 'sent' ORDER BY period_end DESC LIMIT 1",
      [args.identity, args.publication],
    );
    const previousEnd = previous[0]?.period_end.toISOString() ?? null;
    const { rows: clock } = await db.query<{ now: Date }>(
      "SELECT clock_timestamp() AS now",
    );
    period = {
      start: previousEnd ?? new Date(0).toISOString(),
      end: clock[0].now.toISOString(),
    };
    const activity = await loadDigestActivity(
      db,
      args.publication,
      period.start,
      period.end,
      args.ownerDid,
    );
    message = digestMessage(publications[0].name, activity, previousEnd);
    await db.query(
      "INSERT INTO notification_digests (identity, publication, period_start, period_end) VALUES ($1, $2, $3, $4)",
      [args.identity, args.publication, period.start, period.end],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[digest] preparation failed", error);
    return Err("database_error" as const);
  } finally {
    db.release();
  }

  const params = [args.identity, args.publication, period.start, period.end];
  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": args.apiKey,
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        From: process.env.DIGEST_FROM_EMAIL || "Leaflet <accounts@leaflet.pub>",
        To: args.email,
        Subject: message.subject,
        TextBody: message.text,
        Tag: "publication-digest-test",
      }),
    });
    const result = z
      .object({ ErrorCode: z.number() })
      .parse(await response.json());
    if (!response.ok || result.ErrorCode !== 0) {
      // A structured provider rejection is safe to retry. An ambiguous network
      // failure stays pending so a retry cannot silently send a duplicate.
      if (typeof result.ErrorCode === "number" && result.ErrorCode !== 0) {
        await pool.query(
          "UPDATE notification_digests SET status = 'failed' WHERE identity = $1 AND publication = $2 AND period_start = $3 AND period_end = $4",
          params,
        );
        return Err("email_send_failed" as const);
      }
      return Err("delivery_uncertain" as const);
    }
    await pool.query(
      "UPDATE notification_digests SET status = 'sent', sent_at = now() WHERE identity = $1 AND publication = $2 AND period_start = $3 AND period_end = $4",
      params,
    );
    return Ok(null);
  } catch {
    return Err("delivery_uncertain" as const);
  }
}
