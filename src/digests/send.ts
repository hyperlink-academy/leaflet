import { pool } from "supabase/pool";
import { loadDigestActivity } from "./activity";
import { digestMessage } from "./message";
import { Err, Ok, type Result } from "src/result";
import type { DigestSchedule } from "./schedule";
import {
  claimDelivery,
  digestDeliveryKey,
  markFailed,
  markSent,
  markUncertain,
  type DeliveryRef,
} from "src/notificationHistory";
import {
  isPostmarkConfigured,
  sendPostmarkEmail,
} from "src/notificationEmails/postmark";

type DigestArgs = {
  identity: string;
  ownerDid: string;
  publication: string;
  email: string;
  apiKey: string;
  schedule?: DigestSchedule;
};
type DigestMode = "live" | "test";
type ClaimedDigest = {
  message: ReturnType<typeof digestMessage>;
  ref: DeliveryRef;
  mode: DigestMode;
};

export async function sendDigest(args: DigestArgs) {
  // Test emails have their own history so they cannot consume scheduled activity.
  const mode = args.schedule ? "live" : "test";
  const claimed = await claimDigestPeriod(args, mode);
  if (!claimed.ok) return claimed;
  if (!claimed.value) return Ok(null);
  return deliverDigest(args, claimed.value);
}

// Decides whether a digest is due and, if so, records a claim on its period.
// Everything here runs in one transaction under a per-publication lock, so two
// workers cannot claim the same period; the email itself is sent afterwards.
async function claimDigestPeriod(
  args: DigestArgs,
  mode: DigestMode,
): Promise<
  Result<
    ClaimedDigest | null,
    | "already_sending"
    | "unauthorized"
    | "delivery_pending"
    | "email_not_configured"
    | "database_error"
  >
> {
  const db = await pool.connect();
  let committed = false;
  try {
    await db.query("BEGIN");
    const { rows: locks } = await db.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired",
      [`digest:${args.identity}:${args.publication}`],
    );
    if (!locks[0].acquired) return Err("already_sending" as const);
    const { rows: publications } = await db.query<{ name: string }>(
      "SELECT name FROM publications WHERE uri = $1 AND identity_did = $2",
      [args.publication, args.ownerDid],
    );
    if (!publications[0]) return Err("unauthorized" as const);
    if (args.schedule) {
      const { rows } = await db.query(
        "SELECT 1 FROM notification_preferences WHERE identity=$1 AND publication=$2 AND channel='email' AND 'digest'=ANY(enabled_types) AND $3::timestamptz <= clock_timestamp() FOR UPDATE",
        [args.identity, args.publication, args.schedule.due],
      );
      if (!rows.length) return Ok(null);
    }
    const { rows: pending } = await db.query(
      "SELECT 1 FROM notification_history WHERE identity=$1 AND publication=$2 AND channel='email' AND notification_type='digest' AND mode=$3 AND status IN ('pending', 'uncertain') LIMIT 1",
      [args.identity, args.publication, mode],
    );
    if (pending.length) return Err("delivery_pending" as const);
    const { rows: previous } = await db.query<{ period_end: Date }>(
      "SELECT period_end FROM notification_history WHERE identity=$1 AND publication=$2 AND channel='email' AND notification_type='digest' AND mode=$3 AND status IN ('sent', 'skipped') ORDER BY period_end DESC LIMIT 1",
      [args.identity, args.publication, mode],
    );
    const previousEnd = previous[0]?.period_end.toISOString() ?? null;
    const { rows: clock } = await db.query<{ now: Date }>(
      "SELECT clock_timestamp() AS now",
    );
    const period = {
      start: previousEnd ?? new Date(0).toISOString(),
      end: args.schedule?.due ?? clock[0].now.toISOString(),
    };
    if (period.start >= period.end) return Ok(null);
    const activity = await loadDigestActivity(
      db,
      args.publication,
      period.start,
      period.end,
      args.ownerDid,
    );
    const empty =
      !!args.schedule && Object.values(activity).every((count) => count === 0);
    if (!empty && !isPostmarkConfigured(args.apiKey))
      return Err("email_not_configured" as const);
    const ref = {
      identity: args.identity,
      publication: args.publication,
      deliveryKey: digestDeliveryKey(mode, period.start, period.end),
    };
    const claimed = await claimDelivery(db, {
      ...ref,
      notificationType: "digest",
      mode,
      period,
      status: empty ? "skipped" : "pending",
    });
    await db.query("COMMIT");
    committed = true;
    if (empty || !claimed) return Ok(null);
    return Ok({
      message: digestMessage(
        publications[0].name,
        activity,
        previousEnd,
        mode === "test",
      ),
      ref,
      mode,
    });
  } catch (error) {
    console.error("[digest] preparation failed", error);
    return Err("database_error" as const);
  } finally {
    if (!committed) await db.query("ROLLBACK").catch(() => {});
    db.release();
  }
}

async function deliverDigest(
  args: DigestArgs,
  { message, ref, mode }: ClaimedDigest,
) {
  const result = await sendPostmarkEmail(
    {
      from: process.env.DIGEST_FROM_EMAIL || "Leaflet <accounts@leaflet.pub>",
      to: args.email,
      subject: message.subject,
      text: message.text,
      tag: mode === "test" ? "publication-digest-test" : "publication-digest",
    },
    args.apiKey,
  );
  try {
    if (result.outcome === "sent") {
      await markSent(ref, result.messageId);
      return Ok(null);
    }
    if (result.outcome === "rejected") {
      await markFailed(ref);
      return Err("email_send_failed" as const);
    }
    await markUncertain(ref);
  } catch {
    // The history row stays pending, which blocks a duplicate send.
  }
  return Err("delivery_uncertain" as const);
}
