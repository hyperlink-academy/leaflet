import type { PoolClient } from "pg";
import { pool } from "supabase/pool";

export const commentDeliveryKey = (uri: string) => `comments:live:${uri}`;

export function digestDeliveryKey(
  mode: "live" | "test",
  start: string,
  end: string,
) {
  // Match PostgreSQL's six fractional digits when migrating existing history.
  const timestamp = (value: string) =>
    new Date(value).toISOString().replace("Z", "000Z");
  return `digest:${mode}:${timestamp(start)}:${timestamp(end)}`;
}

export type DeliveryRef = {
  identity: string;
  publication: string;
  deliveryKey: string;
  channel?: string;
};

// Inserts the delivery, or takes over one that previously failed. False means
// another run already owns it, so the caller must not send.
export async function claimDelivery(
  db: Pick<PoolClient, "query">,
  delivery: DeliveryRef & {
    notificationType: "digest" | "comments";
    mode?: "live" | "test";
    subjectUri?: string;
    period?: { start: string; end: string };
    status?: "pending" | "skipped";
  },
) {
  const { rows } = await db.query(
    `INSERT INTO notification_history (identity, publication, channel, notification_type, mode, delivery_key, subject_uri, period_start, period_end, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (identity, publication, channel, delivery_key)
     DO UPDATE SET status=excluded.status WHERE notification_history.status='failed'
     RETURNING identity`,
    [
      delivery.identity,
      delivery.publication,
      delivery.channel ?? "email",
      delivery.notificationType,
      delivery.mode ?? "live",
      delivery.deliveryKey,
      delivery.subjectUri ?? null,
      delivery.period?.start ?? null,
      delivery.period?.end ?? null,
      delivery.status ?? "pending",
    ],
  );
  return rows.length > 0;
}

export async function markSent(ref: DeliveryRef, messageId: string | null) {
  await pool.query(
    "UPDATE notification_history SET status='sent', sent_at=now(), provider_message_id=$5 WHERE identity=$1 AND publication=$2 AND channel=$3 AND delivery_key=$4",
    [
      ref.identity,
      ref.publication,
      ref.channel ?? "email",
      ref.deliveryKey,
      messageId,
    ],
  );
}

async function settleUnsent(ref: DeliveryRef, status: "failed" | "uncertain") {
  await pool.query(
    "UPDATE notification_history SET status=$5 WHERE identity=$1 AND publication=$2 AND channel=$3 AND delivery_key=$4 AND status='pending'",
    [
      ref.identity,
      ref.publication,
      ref.channel ?? "email",
      ref.deliveryKey,
      status,
    ],
  );
}

// The provider refused the message, so a later run may claim and retry it.
export const markFailed = (ref: DeliveryRef) => settleUnsent(ref, "failed");

// The message may have been delivered, so it stays claimed and is not retried.
export const markUncertain = (ref: DeliveryRef) =>
  settleUnsent(ref, "uncertain");
