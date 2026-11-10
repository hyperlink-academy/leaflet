import { pool } from "supabase/pool";
import { loadDigestActivity } from "./activity";
import { digestMessage } from "./message";
import { Err, Ok } from "src/result";
import { z } from "zod";
import type { DigestSchedule } from "./schedule";
import { digestDeliveryKey } from "src/notificationHistory";

export async function sendDigest(args: {
  identity: string;
  ownerDid: string;
  publication: string;
  email: string;
  apiKey: string;
  schedule?: DigestSchedule;
}) {
  // Test emails have their own history so they cannot consume scheduled activity.
  const mode = args.schedule ? "live" : "test";
  const db = await pool.connect();
  let period: { start: string; end: string };
  let message: ReturnType<typeof digestMessage>;
  let deliveryKey: string;
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
    if (args.schedule) {
      const { rows } = await db.query(
        "SELECT 1 FROM notification_preferences WHERE identity=$1 AND publication=$2 AND channel='email' AND 'digest'=ANY(enabled_types) AND $3::timestamptz <= clock_timestamp() FOR UPDATE",
        [args.identity, args.publication, args.schedule.due],
      );
      if (!rows.length) {
        await db.query("ROLLBACK");
        return Ok(null);
      }
    }
    const { rows: pending } = await db.query(
      "SELECT 1 FROM notification_history WHERE identity=$1 AND publication=$2 AND channel='email' AND notification_type='digest' AND mode=$3 AND status IN ('pending', 'uncertain') LIMIT 1",
      [args.identity, args.publication, mode],
    );
    if (pending.length) {
      await db.query("ROLLBACK");
      return Err("delivery_pending" as const);
    }
    const { rows: previous } = await db.query<{ period_end: Date }>(
      "SELECT period_end FROM notification_history WHERE identity=$1 AND publication=$2 AND channel='email' AND notification_type='digest' AND mode=$3 AND status IN ('sent', 'skipped') ORDER BY period_end DESC LIMIT 1",
      [args.identity, args.publication, mode],
    );
    const previousEnd = previous[0]?.period_end.toISOString() ?? null;
    const { rows: clock } = await db.query<{ now: Date }>(
      "SELECT clock_timestamp() AS now",
    );
    period = {
      start: previousEnd ?? new Date(0).toISOString(),
      end: args.schedule?.due ?? clock[0].now.toISOString(),
    };
    if (period.start >= period.end) {
      await db.query("ROLLBACK");
      return Ok(null);
    }
    const activity = await loadDigestActivity(
      db,
      args.publication,
      period.start,
      period.end,
      args.ownerDid,
    );
    const empty =
      !!args.schedule && Object.values(activity).every((count) => count === 0);
    if (!empty && (!args.apiKey || args.apiKey === "POSTMARK_API_TEST")) {
      await db.query("ROLLBACK");
      return Err("email_not_configured" as const);
    }
    message = digestMessage(
      publications[0].name,
      activity,
      previousEnd,
      mode === "test",
    );
    deliveryKey = digestDeliveryKey(mode, period.start, period.end);
    const { rows: claimed } = await db.query(
      `INSERT INTO notification_history (identity, publication, channel, notification_type, period_start, period_end, mode, status, delivery_key)
       VALUES ($1, $2, 'email', 'digest', $3, $4, $5, $6, $7)
       ON CONFLICT (identity, publication, channel, delivery_key)
       DO UPDATE SET status=excluded.status WHERE notification_history.status='failed'
       RETURNING identity`,
      [
        args.identity,
        args.publication,
        period.start,
        period.end,
        mode,
        empty ? "skipped" : "pending",
        deliveryKey,
      ],
    );
    await db.query("COMMIT");
    if (empty || !claimed.length) return Ok(null);
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[digest] preparation failed", error);
    return Err("database_error" as const);
  } finally {
    db.release();
  }

  const params = [args.identity, args.publication, deliveryKey];
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
        Tag: mode === "test" ? "publication-digest-test" : "publication-digest",
      }),
    });
    const result = z
      .object({ ErrorCode: z.number(), MessageID: z.string().optional() })
      .parse(await response.json());
    if (!response.ok || result.ErrorCode !== 0) {
      // A structured provider rejection is safe to retry. An ambiguous network
      // failure stays pending so a retry cannot silently send a duplicate.
      if (typeof result.ErrorCode === "number" && result.ErrorCode !== 0) {
        await pool.query(
          "UPDATE notification_history SET status='failed' WHERE identity=$1 AND publication=$2 AND channel='email' AND delivery_key=$3",
          params,
        );
        return Err("email_send_failed" as const);
      }
      return Err("delivery_uncertain" as const);
    }
    await pool.query(
      "UPDATE notification_history SET status='sent', sent_at=now(), provider_message_id=$4 WHERE identity=$1 AND publication=$2 AND channel='email' AND delivery_key=$3",
      [...params, result.MessageID ?? null],
    );
    return Ok(null);
  } catch {
    return Err("delivery_uncertain" as const);
  }
}
