import { pool } from "supabase/pool";
import { inngest } from "app/api/inngest/client";
import { isDigestFrequency, nextDigestAt } from "./frequencies";

export type DigestSchedule = {
  identity: string;
  publication: string;
  generation: string;
  due: string;
};
type ScheduleRow = {
  digest_schedule_id: string;
  digest_next_at: Date | null;
  digest_frequency: string | null;
  enabled_types: string[];
};

export function digestScheduleEvent(schedule: DigestSchedule) {
  return {
    id: `digest:${schedule.generation}:${schedule.due}`,
    name: "notifications/digest.scheduled" as const,
    data: schedule,
  };
}

// Initialize a saved opt-in, or advance one generation without racing a save.
async function updateSchedule(
  identity: string,
  publication: string,
  previous?: DigestSchedule,
) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query<ScheduleRow>(
      "SELECT digest_schedule_id, digest_next_at, digest_frequency, enabled_types FROM notification_preferences WHERE identity=$1 AND publication=$2 AND channel='email' FOR UPDATE",
      [identity, publication],
    );
    const row = rows[0];
    let result: DigestSchedule | null = null;
    if (
      row?.enabled_types.includes("digest") &&
      isDigestFrequency(row.digest_frequency) &&
      (!previous || row.digest_schedule_id === previous.generation)
    ) {
      let due: string | undefined = row.digest_next_at?.toISOString();
      if (!due || (previous && due === previous.due)) {
        const { rows: clock } = await db.query<{ now: Date }>(
          "SELECT clock_timestamp() AS now",
        );
        const after =
          previous && previous.due > clock[0].now.toISOString()
            ? previous.due
            : clock[0].now.toISOString();
        due = nextDigestAt(row.digest_frequency, after);
        await db.query(
          "UPDATE notification_preferences SET digest_next_at=$3 WHERE identity=$1 AND publication=$2 AND channel='email'",
          [identity, publication, due],
        );
      }
      if (due && (!previous || due > previous.due))
        result = {
          identity,
          publication,
          generation: row.digest_schedule_id,
          due,
        };
    }
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

export async function queueDigestSchedule(
  identity: string,
  publication: string,
) {
  const schedule = await updateSchedule(identity, publication);
  if (schedule) await inngest.send(digestScheduleEvent(schedule));
}

export function advanceDigestSchedule(schedule: DigestSchedule) {
  return updateSchedule(schedule.identity, schedule.publication, schedule);
}

export async function isCurrentDigestSchedule(schedule: DigestSchedule) {
  const { rows } = await pool.query(
    "SELECT 1 FROM notification_preferences WHERE identity=$1 AND publication=$2 AND channel='email' AND digest_schedule_id=$3 AND digest_next_at=$4 AND 'digest'=ANY(enabled_types)",
    [
      schedule.identity,
      schedule.publication,
      schedule.generation,
      schedule.due,
    ],
  );
  return rows.length > 0;
}
