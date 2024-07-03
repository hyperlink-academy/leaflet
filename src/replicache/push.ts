"use server";
import { PushRequest, PushResponse } from "replicache";
import { serverMutationContext } from "./serverMutationContext";
import { mutations } from "./mutations";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { permission_token_rights, replicache_clients } from "drizzle/schema";
import { getClientGroup } from "./utils";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";

const client = postgres(process.env.DB_URL as string);
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const db = drizzle(client);
export async function Push(
  pushRequest: PushRequest,
  rootEntity: string,
  token: { id: string },
): Promise<PushResponse | undefined> {
  if (pushRequest.pushVersion !== 1)
    return { error: "VersionNotSupported", versionType: "push" };
  let clientGroup = await getClientGroup(db, pushRequest.clientGroupID);
  let token_rights = await db
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
    await db.transaction(async (tx) => {
      try {
        await mutations[name](
          mutation.args as any,
          serverMutationContext(tx, token_rights),
        );
      } catch (e) {
        console.log(
          `Error occured while running mutation: ${name}`,
          JSON.stringify(e),
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
    });
  }

  let channel = supabase.channel(`rootEntity:${rootEntity}`);
  await channel.send({
    type: "broadcast",
    event: "poke",
    payload: { message: "poke" },
  });
  supabase.removeChannel(channel);
  return undefined;
}
