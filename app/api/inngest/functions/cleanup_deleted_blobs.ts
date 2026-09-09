import { cron } from "inngest";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, inArray } from "drizzle-orm";
import { pool } from "supabase/pool";
import { blob_cleanup_queue } from "drizzle/schema";
import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";

const BATCH_SIZE = 200;
const MAX_BATCHES_PER_RUN = 10;

export const cleanup_deleted_blobs = inngest.createFunction(
  { id: "cleanup_deleted_blobs", triggers: [cron("0 3 * * *")] },
  async ({ step }) => {
    let totalDeleted = 0;

    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
      let paths = await step.run(`collect-deletable-${batch}`, async () => {
        let client = await pool.connect();
        try {
          let db = drizzle(client);
          await db.execute(sql`
            DELETE FROM blob_cleanup_queue q
            WHERE EXISTS (
              SELECT 1 FROM facts f
              WHERE f.data->>'type' = 'image'
                AND split_part(split_part(f.data->>'src', '?', 1), '/', -1) = q.path
            )
          `);
          let { rows } = await db.execute<{ path: string }>(sql`
            SELECT q.path FROM blob_cleanup_queue q
            WHERE q.queued_at < now() - interval '1 day'
              AND NOT EXISTS (
                SELECT 1 FROM document_version_blob_refs r WHERE r.path = q.path
              )
              AND NOT EXISTS (
                SELECT 1 FROM facts f
                WHERE f.data->>'type' = 'image'
                  AND split_part(split_part(f.data->>'src', '?', 1), '/', -1) = q.path
              )
            LIMIT ${BATCH_SIZE}
          `);
          return rows.map((r) => r.path);
        } finally {
          client.release();
        }
      });

      if (paths.length === 0) break;

      await step.run(`delete-batch-${batch}`, async () => {
        let { error } = await supabaseServerClient.storage
          .from("minilink-user-assets")
          .remove(paths);
        if (error) throw new Error(`Failed to remove blobs: ${error.message}`);

        let client = await pool.connect();
        try {
          let db = drizzle(client);
          await db
            .delete(blob_cleanup_queue)
            .where(inArray(blob_cleanup_queue.path, paths));
        } finally {
          client.release();
        }
      });

      totalDeleted += paths.length;
      if (paths.length < BATCH_SIZE) break;
    }

    return { deleted: totalDeleted };
  },
);
