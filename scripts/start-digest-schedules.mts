import { pool } from "supabase/pool";
import { queueDigestSchedule } from "src/digests/schedule";

// One-time bootstrap (or explicit repair), not a recurring preference scan.
try {
  const { rows } = await pool.query<{ identity: string; publication: string }>(
    "SELECT identity, publication FROM notification_preferences WHERE channel='email' AND 'digest'=ANY(enabled_types)",
  );
  for (const row of rows) {
    await queueDigestSchedule(row.identity, row.publication);
  }
  console.log(`Queued ${rows.length} digest schedules.`);
} finally {
  await pool.end();
}
