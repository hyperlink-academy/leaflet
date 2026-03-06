import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient } from "lexicons/api";

// Batch size to avoid Inngest payload limits and PDS rate limits
const BATCH_SIZE = 50;

// Helper to create authenticated agent - must be called fresh in each step
// (OAuth sessions cannot be serialized across Inngest steps)
async function createAuthenticatedAgent(did: string): Promise<AtpBaseClient> {
  const result = await restoreOAuthSession(did);
  if (!result.ok) {
    throw new Error(`Failed to restore OAuth session: ${result.error.message}`);
  }
  return new AtpBaseClient(result.value.fetchHandler.bind(result.value));
}

export const write_records_to_pds = inngest.createFunction(
  { id: "write-records-to-pds" },
  { event: "user/write-records-to-pds" },
  async ({ event, step }) => {
    const { did, records } = event.data;

    // Step 1: Verify OAuth session is valid before proceeding
    await step.run("verify-oauth-session", async () => {
      const result = await restoreOAuthSession(did);
      if (!result.ok) {
        throw new Error(`OAuth restore failed: ${result.error.message}`);
      }
      return { success: true };
    });

    // Step 2: Write records to PDS in batches
    // Split records into batches to avoid payload limits and rate limiting
    const batches: typeof records[] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    let totalWritten = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchWritten = await step.run(
        `write-batch-${batchIndex}`,
        async () => {
          const agent = await createAuthenticatedAgent(did);
          let written = 0;
          for (const rec of batch) {
            await agent.com.atproto.repo.putRecord({
              repo: did,
              collection: rec.collection,
              rkey: rec.rkey,
              record: rec.record as Record<string, unknown>,
              validate: false,
            });
            written++;
          }
          return written;
        },
      );
      totalWritten += batchWritten;
    }

    return {
      success: true,
      recordsWritten: totalWritten,
      batchCount: batches.length,
    };
  },
);
