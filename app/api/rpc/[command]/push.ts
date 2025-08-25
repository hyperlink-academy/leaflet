import { mutations } from "src/replicache/mutations";
import { eq, sql } from "drizzle-orm";
import { permission_token_rights, replicache_clients } from "drizzle/schema";
import { getClientGroup } from "src/replicache/utils";
import { makeRoute } from "../lib";
import { z } from "zod";
import type { Env } from "./route";
import { cachedServerMutationContext } from "src/replicache/cachedServerMutationContext";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { DbPool } from "@vercel/functions/db-connections";

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

const pool = new Pool({
  idleTimeoutMillis: 5000,
  min: 1,
  connectionString: process.env.DB_URL,
});

// Attach the pool to ensure idle connections close before suspension
attachDatabasePool(pool as DbPool);

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

    let client = await pool.connect();
    const db = drizzle(client);

    let channel = supabase.channel(`rootEntity:${rootEntity}`);
    try {
      await db.transaction(async (tx) => {
        let clientGroup = await getClientGroup(tx, pushRequest.clientGroupID);
        let token_rights = await tx
          .select()
          .from(permission_token_rights)
          .where(eq(permission_token_rights.token, token.id));
        let { ctx, flush } = cachedServerMutationContext(
          tx,
          token.id,
          token_rights,
        );

        let lastMutations = new Map<string, number>();
        console.log(pushRequest.mutations.map((m) => m.name));
        for (let mutation of pushRequest.mutations) {
          let lastMutationID = clientGroup[mutation.clientID] || 0;
          if (mutation.id <= lastMutationID) continue;
          clientGroup[mutation.clientID] = mutation.id;
          let name = mutation.name as keyof typeof mutations;
          if (!mutations[name]) {
            continue;
          }
          try {
            await mutations[name](mutation.args as any, ctx);
          } catch (e) {
            console.log(
              `Error occured while running mutation: ${name}`,
              JSON.stringify(e),
              JSON.stringify(mutation, null, 2),
            );
          }
          lastMutations.set(mutation.clientID, mutation.id);
        }

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
        await flush();
      });

      await channel.send({
        type: "broadcast",
        event: "poke",
        payload: { message: "poke" },
      });
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
      supabase.removeChannel(channel);
      return { result: undefined } as const;
    }
  },
});
