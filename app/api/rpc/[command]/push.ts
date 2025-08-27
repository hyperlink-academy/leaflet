import { mutations } from "src/replicache/mutations";
import { eq, sql } from "drizzle-orm";
import { permission_token_rights, replicache_clients } from "drizzle/schema";
import { getClientGroup } from "src/replicache/utils";
import { makeRoute } from "../lib";
import { z } from "zod";
import type { Env } from "./route";
import { cachedServerMutationContext } from "src/replicache/cachedServerMutationContext";
import { drizzle } from "drizzle-orm/node-postgres";
import { Lock } from "src/utils/lock";
import { pool } from "supabase/pool";

const mutationV0Schema = z.object({
  id: z.number(),
  name: z.string(),
  args: z.unknown(),
  timestamp: z.number(),
});

const mutationV1Schema = mutationV0Schema.extend({
  clientID: z.string(),
});

const pushRequestV0Schema = z.object({
  pushVersion: z.literal(0),
  schemaVersion: z.string(),
  profileID: z.string(),
  clientID: z.string(),
  mutations: z.array(mutationV0Schema),
});

const pushRequestV1Schema = z.object({
  pushVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  clientGroupID: z.string(),
  mutations: z.array(mutationV1Schema),
});

// Combine both versions into final PushRequest schema
const pushRequestSchema = z.discriminatedUnion("pushVersion", [
  pushRequestV0Schema,
  pushRequestV1Schema,
]);

type PushRequestZ = z.infer<typeof pushRequestSchema>;

let locks = new Map<string, Lock>();

export const push = makeRoute({
  route: "push",
  input: z.object({
    pushRequest: pushRequestSchema,
    rootEntity: z.string(),
    token: z.object({ id: z.string() }),
  }),
  handler: async ({ pushRequest, rootEntity, token }, { supabase }: Env) => {
    if (pushRequest.pushVersion !== 1) {
      return {
        result: { error: "VersionNotSupported", versionType: "push" } as const,
      };
    }
    let timeWaitingForLock: number;
    let timeWaitingForDbConnection: number;
    let timeProcessingMutations: number = 0;
    let timeGettingClientGroup: number = 0;
    let timeGettingTokenRights: number = 0;
    let timeFlushingContext: number = 0;
    let timeUpdatingLastMutations: number = 0;
    let mutationTimings: Array<{
      name: string;
      duration: number;
    }> = [];

    let start = performance.now();
    let client = await pool.connect();
    timeWaitingForDbConnection = performance.now() - start;
    start = performance.now();
    const db = drizzle(client);
    let channel = supabase.channel(`rootEntity:${rootEntity}`);
    let lock = locks.get(token.id);
    if (!lock) {
      lock = new Lock();
      locks.set(token.id, lock);
    }
    let release = await lock.lock();
    timeWaitingForLock = performance.now() - start;
    start = performance.now();
    try {
      await db.transaction(async (tx) => {
        let clientGroupStart = performance.now();
        let clientGroup = await getClientGroup(tx, pushRequest.clientGroupID);
        timeGettingClientGroup = performance.now() - clientGroupStart;

        let tokenRightsStart = performance.now();
        let token_rights = await tx
          .select()
          .from(permission_token_rights)
          .where(eq(permission_token_rights.token, token.id));
        timeGettingTokenRights = performance.now() - tokenRightsStart;
        let { getContext, flush } = cachedServerMutationContext(
          tx,
          token.id,
          token_rights,
        );

        let lastMutations = new Map<string, number>();
        console.log(`Processing mutations on ${token.id}`);
        console.log(
          `Processing ${pushRequest.mutations.length} mutations:`,
          pushRequest.mutations.map((m) => m.name),
        );

        for (let mutation of pushRequest.mutations) {
          let lastMutationID = clientGroup[mutation.clientID] || 0;
          if (mutation.id <= lastMutationID) continue;

          clientGroup[mutation.clientID] = mutation.id;
          let name = mutation.name as keyof typeof mutations;
          if (!mutations[name]) {
            continue;
          }

          let mutationStart = performance.now();
          try {
            let ctx = getContext(mutation.clientID, mutation.id);
            await mutations[name](mutation.args as any, ctx);
            let mutationDuration = performance.now() - mutationStart;
            mutationTimings.push({
              name: mutation.name,
              duration: mutationDuration,
            });
          } catch (e) {
            let mutationDuration = performance.now() - mutationStart;
            mutationTimings.push({
              name: mutation.name,
              duration: mutationDuration,
            });
            console.log(
              `Error occurred while running mutation: ${name} after ${mutationDuration.toFixed(2)}ms`,
              JSON.stringify(e),
              JSON.stringify(mutation, null, 2),
            );
          }
          lastMutations.set(mutation.clientID, mutation.id);
        }

        let dbUpdateStart = performance.now();
        let lastMutationIdsUpdate = Array.from(lastMutations.entries()).map(
          (entries) => ({
            client_group: pushRequest.clientGroupID,
            client_id: entries[0],
            last_mutation: entries[1],
          }),
        );
        if (lastMutationIdsUpdate.length > 0)
          await tx
            .insert(replicache_clients)
            .values(lastMutationIdsUpdate)
            .onConflictDoUpdate({
              target: replicache_clients.client_id,
              set: { last_mutation: sql`excluded.last_mutation` },
            });
        timeUpdatingLastMutations = performance.now() - dbUpdateStart;

        let flushStart = performance.now();
        await flush();
        timeFlushingContext = performance.now() - flushStart;
      });
      timeProcessingMutations = performance.now() - start;

      await channel.send({
        type: "broadcast",
        event: "poke",
        payload: { message: "poke" },
      });
    } catch (e) {
      timeProcessingMutations = performance.now() - start;
      console.log(e);
    } finally {
      // Calculate mutation statistics
      let totalMutationTime = mutationTimings.reduce(
        (sum, m) => sum + m.duration,
        0,
      );

      console.log(`
Push Request Performance Summary (${timeProcessingMutations.toFixed(2)}ms):
================================
Total Elapsed Time:              ${timeProcessingMutations.toFixed(2)}ms
Time Waiting for DB Connection:  ${timeWaitingForDbConnection.toFixed(2)}ms
Time Waiting For Lock:           ${timeWaitingForLock.toFixed(2)}ms
Time Getting Client Group:       ${timeGettingClientGroup.toFixed(2)}ms
Time Getting Token Rights:       ${timeGettingTokenRights.toFixed(2)}ms
Time Updating Last Mutations:    ${timeUpdatingLastMutations.toFixed(2)}ms
Time Flushing Context:           ${timeFlushingContext.toFixed(2)}ms

Mutation Statistics:
===================
Total Mutations Processed:       ${mutationTimings.length}
Total Mutation Execution Time:   ${totalMutationTime.toFixed(2)}ms
Average Mutation Time:           ${mutationTimings.length > 0 ? (totalMutationTime / mutationTimings.length).toFixed(2) : "0.00"}ms

Slowest Mutations:
${mutationTimings
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 5)
  .map((m) => `  ${m.name}: ${m.duration.toFixed(2)}ms`)
  .join("\n")}
      `);

      if (mutationTimings.length > 10) {
        console.log(
          "\nDetailed Mutation Timings:",
          mutationTimings.map((m) => ({
            mutation: m.name,
            duration: `${m.duration.toFixed(2)}ms`,
          })),
        );
      }
      client.release();
      release();
      supabase.removeChannel(channel);
      return { result: undefined } as const;
    }
  },
});
