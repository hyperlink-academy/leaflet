import { pool } from "supabase/pool";
import type { DigestSchedule } from "./schedule";
import { sendDigest } from "./send";
import { emailNotificationsEnabled } from "src/notificationEmails/entitlement";

export async function sendScheduledDigest(schedule: DigestSchedule) {
  if (!(await emailNotificationsEnabled(schedule.identity)))
    return { skipped: "feature_disabled" };
  const { rows } = await pool.query<{ atp_did: string; email: string | null }>(
    "SELECT atp_did, email FROM identities WHERE id=$1",
    [schedule.identity],
  );
  const identity = rows[0];
  if (!identity?.email) return { skipped: "no_email" };
  const result = await sendDigest({
    identity: schedule.identity,
    publication: schedule.publication,
    ownerDid: identity.atp_did,
    email: identity.email,
    apiKey: process.env.POSTMARK_API_KEY || "",
    schedule,
  });
  if (
    !result.ok &&
    !["delivery_pending", "delivery_uncertain"].includes(result.error)
  )
    throw new Error(`Digest failed: ${result.error}`);
  return result;
}
