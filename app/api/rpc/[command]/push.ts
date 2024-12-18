import { PushResponse } from "replicache";
import { serverMutationContext } from "src/replicache/serverMutationContext";
import { mutations } from "src/replicache/mutations";
import { eq } from "drizzle-orm";
import { permission_token_rights, replicache_clients } from "drizzle/schema";
import { getClientGroup } from "src/replicache/utils";
import { makeRoute } from "../lib";
import { z } from "zod";
import { Env } from "./route";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

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

    const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
    const db = drizzle(client);

    await db.transaction(async (tx) => {
      let clientGroup = await getClientGroup(tx, pushRequest.clientGroupID);
      let token_rights = await tx
        .select()
        .from(permission_token_rights)
        .where(eq(permission_token_rights.token, token.id));
      for (let mutation of pushRequest.mutations) {
        let lastMutationID = clientGroup[mutation.clientID] || 0;
        if (mutation.id <= lastMutationID) continue;
        clientGroup[mutation.clientID] = mutation.id;
        let name = mutation.name as keyof typeof mutations;
        if (!mutations[name]) {
          continue;
        }
        try {
          await mutations[name](
            mutation.args as any,
            serverMutationContext(tx, token_rights),
          );
        } catch (e) {
          console.log(
            `Error occured while running mutation: ${name}`,
            JSON.stringify(e),
            JSON.stringify(mutation, null, 2),
          );
        }
        await tx
          .insert(replicache_clients)
          .values({
            client_group: pushRequest.clientGroupID,
            client_id: mutation.clientID,
            last_mutation: mutation.id,
          })
          .onConflictDoUpdate({
            target: replicache_clients.client_id,
            set: { last_mutation: mutation.id },
          });
      }
    });

    let channel = supabase.channel(`rootEntity:${rootEntity}`);
    await channel.send({
      type: "broadcast",
      event: "poke",
      payload: { message: "poke" },
    });
    client.end();
    supabase.removeChannel(channel);
    return { result: undefined } as const;
  },
});
