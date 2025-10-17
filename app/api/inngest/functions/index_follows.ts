import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent, AtUri } from "@atproto/api";
import { createIdentity } from "actions/createIdentity";
import { drizzle } from "drizzle-orm/node-postgres";
import { inngest } from "../client";
import { pool } from "supabase/pool";

export const index_follows = inngest.createFunction(
  {
    id: "index_follows",
    throttle: {
      limit: 1,
      period: "5m",
      key: "event.data.did",
    },
  },
  { event: "feeds/index-follows" },
  async ({ event, step }) => {
    let follows: string[] = [];
    let cursor: null | string = null;
    let hasMore = true;
    let pageNumber = 0;
    while (hasMore) {
      let page: {
        cursor?: string;
        follows: string[];
      } = await step.run(`get-follows-${pageNumber}`, async () => {
        let agent = new AtpAgent({ service: "https://public.api.bsky.app" });
        let follows = await agent.app.bsky.graph.getFollows({
          actor: event.data.did,
          limit: 100,
          cursor: cursor || undefined,
        });
        if (!follows.success)
          throw new Error(
            "error during querying follows for: " + event.data.did,
          );
        return {
          cursor: follows.data.cursor,
          follows: follows.data.follows.map((f) => f.did),
        };
      });
      pageNumber++;
      follows.push(...page.follows);
      cursor = page.cursor || null;
      if (!cursor) hasMore = false;
    }
    let existingFollows: string[] = [];
    const batchSize = 100;
    let batchNumber = 0;

    // Create all check batches in parallel
    const checkBatches: Promise<any>[] = [
      step.run("check-if-identity-exists", async () => {
        let { data: exists } = await supabaseServerClient
          .from("identities")
          .select()
          .eq("atp_did", event.data.did)
          .single();
        if (!exists) {
          const client = await pool.connect();
          let db = drizzle(client);
          let identity = await createIdentity(db, { atp_did: event.data.did });
          client.release();
          return identity;
        }
      }),
    ];
    for (let i = 0; i < follows.length; i += batchSize) {
      const batch = follows.slice(i, i + batchSize);
      checkBatches.push(
        step.run(`check-existing-follows-batch-${batchNumber}`, async () => {
          const { data: existingIdentities } = await supabaseServerClient
            .from("identities")
            .select("atp_did")
            .in("atp_did", batch);

          return existingIdentities?.map((identity) => identity.atp_did!) || [];
        }),
      );
      batchNumber++;
    }

    // Wait for all check batches to complete
    const batchResults = await Promise.all(checkBatches);
    existingFollows = batchResults.flat().filter(Boolean);

    // Filter follows to only include those that exist in identities table
    const insertBatchSize = 100;
    let insertBatchNumber = 0;

    // Create all insert batches in parallel
    const insertBatches = [];
    for (let i = 0; i < existingFollows.length; i += insertBatchSize) {
      const batch = existingFollows.slice(i, i + insertBatchSize);
      insertBatches.push(
        step.run(`insert-follows-batch-${insertBatchNumber}`, async () => {
          const insertData = batch.map((f) => ({
            identity: event.data.did,
            follows: f,
          }));

          return await supabaseServerClient
            .from("bsky_follows")
            .upsert(insertData);
        }),
      );
      insertBatchNumber++;
    }

    // Wait for all insert batches to complete
    await Promise.all(insertBatches);

    // Delete follows that are no longer in the fetched list
    // For large follow lists, we need to batch this operation
    await step.run("delete-unfollowed", async () => {
      // Get all current follows from the database
      const { data: currentFollows } = await supabaseServerClient
        .from("bsky_follows")
        .select("follows")
        .eq("identity", event.data.did);

      if (!currentFollows || currentFollows.length === 0) {
        return { deleted: 0 };
      }

      // Find follows that are in the database but not in the newly fetched list
      const currentFollowDids = currentFollows.map((f) => f.follows);
      const toDelete = currentFollowDids.filter(
        (did) => !existingFollows.includes(did)
      );

      if (toDelete.length === 0) {
        return { deleted: 0 };
      }

      // Delete in batches to avoid query size limits
      const deleteBatchSize = 100;
      const deletePromises = [];
      for (let i = 0; i < toDelete.length; i += deleteBatchSize) {
        const batch = toDelete.slice(i, i + deleteBatchSize);
        deletePromises.push(
          supabaseServerClient
            .from("bsky_follows")
            .delete()
            .eq("identity", event.data.did)
            .in("follows", batch)
        );
      }

      await Promise.all(deletePromises);
      return { deleted: toDelete.length };
    });
    return {
      done: true,
    };
  },
);
