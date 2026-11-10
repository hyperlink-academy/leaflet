import { pool } from "supabase/pool";
import { EMAIL_NOTIFICATION_ENTITLEMENT_KEY } from "src/entitlements";
import {
  digestFrequencyValues,
  isDigestFrequency,
  nextDigestAt,
  type DigestFrequency,
} from "./frequencies";

export type DigestSchedule = {
  identity: string;
  publication: string;
  due: string;
};
export type DueDigest = DigestSchedule & { frequency: DigestFrequency };

export function digestScheduleEvent(schedule: DigestSchedule) {
  return {
    // Same period, same id: Inngest drops the duplicate if a run is repeated.
    id: `digest:${schedule.identity}:${schedule.publication}:${schedule.due}`,
    name: "notifications/digest.scheduled" as const,
    data: schedule,
  };
}

// Opt-ins start counting from their next calendar boundary. One UPDATE per
// frequency, guarded on NULL, so concurrent runs cannot overwrite each other.
export async function initializeDigestSchedules() {
  const now = new Date().toISOString();
  let initialized = 0;
  for (const frequency of digestFrequencyValues) {
    const { rowCount } = await pool.query(
      "UPDATE notification_preferences p SET digest_next_at=$1 WHERE channel='email' AND 'digest'=ANY(enabled_types) AND digest_frequency=$2 AND digest_next_at IS NULL AND EXISTS (SELECT 1 FROM user_entitlements e WHERE e.identity_id=p.identity AND e.entitlement_key=$3 AND (e.expires_at IS NULL OR e.expires_at > now()))",
      [
        nextDigestAt(frequency, now),
        frequency,
        EMAIL_NOTIFICATION_ENTITLEMENT_KEY,
      ],
    );
    initialized += rowCount ?? 0;
  }
  return initialized;
}

export async function findDueDigests(limit: number): Promise<DueDigest[]> {
  const { rows } = await pool.query<{
    identity: string;
    publication: string;
    due: Date;
    digest_frequency: string | null;
  }>(
    "SELECT p.identity, p.publication, p.digest_next_at AS due, p.digest_frequency FROM notification_preferences p JOIN user_entitlements e ON e.identity_id=p.identity AND e.entitlement_key=$2 WHERE channel='email' AND 'digest'=ANY(enabled_types) AND digest_next_at <= now() AND (e.expires_at IS NULL OR e.expires_at > now()) ORDER BY digest_next_at LIMIT $1",
    [limit, EMAIL_NOTIFICATION_ENTITLEMENT_KEY],
  );
  return rows.flatMap((row) =>
    isDigestFrequency(row.digest_frequency)
      ? [
          {
            identity: row.identity,
            publication: row.publication,
            due: row.due.toISOString(),
            frequency: row.digest_frequency,
          },
        ]
      : [],
  );
}

// Skips any periods that were missed while the cron was down: the next run is
// the first boundary after now, not after the old due time. Guarded on the old
// due time so a frequency change that reset the schedule is not overwritten.
export async function advanceDigestSchedules(due: DueDigest[]) {
  if (!due.length) return;
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE notification_preferences p SET digest_next_at = v.next_at
     FROM unnest($1::uuid[], $2::text[], $3::timestamptz[], $4::timestamptz[])
       AS v(identity, publication, due, next_at)
     WHERE p.identity = v.identity AND p.publication = v.publication
       AND p.channel = 'email' AND p.digest_next_at = v.due`,
    [
      due.map((d) => d.identity),
      due.map((d) => d.publication),
      due.map((d) => d.due),
      due.map((d) => nextDigestAt(d.frequency, d.due > now ? d.due : now)),
    ],
  );
}
