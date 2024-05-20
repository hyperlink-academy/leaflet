"use server";
import { PushRequest, PushResponse } from "replicache";
import * as base64 from "base64-js";
import * as Y from "yjs";
import { mutations } from "./mutations";
import { drizzle } from "drizzle-orm/postgres-js";
import * as driz from "drizzle-orm";
import postgres from "postgres";
import { entities, facts, replicache_clients } from "../drizzle/schema";
import { Attributes } from "./attributes";
import { getClientGroup } from "./utils";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/database.types";
import { Fact } from ".";

const client = postgres(process.env.DB_URL as string);
let supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);
const db = drizzle(client);
export async function Push(
  pushRequest: PushRequest,
  rootEntity: string,
): Promise<PushResponse | undefined> {
  if (pushRequest.pushVersion !== 1)
    return { error: "VersionNotSupported", versionType: "push" };
  let clientGroup = await getClientGroup(db, pushRequest.clientGroupID);
  for (let mutation of pushRequest.mutations) {
    let lastMutationID = clientGroup[mutation.clientID] || 0;
    if (mutation.id <= lastMutationID) continue;
    clientGroup[mutation.clientID] = mutation.id;
    let name = mutation.name as keyof typeof mutations;
    if (!mutations[name]) {
      continue;
    }
    db.transaction(async (tx) => {
      try {
        await mutations[name](mutation.args as any, {
          async createEntity(entity) {
            console.log(
              await tx.insert(entities).values({
                id: entity,
              }),
            );
            return true;
          },
          async assertFact(f) {
            let attribute = Attributes[f.attribute as keyof typeof Attributes];
            if (!attribute) return;
            let id = f.id || crypto.randomUUID();
            let data = { ...f.data };
            if (attribute.cardinality === "one") {
              let existingFact = await tx
                .select({ id: facts.id, data: facts.data })
                .from(facts)
                .where(
                  driz.and(
                    driz.eq(facts.attribute, f.attribute),
                    driz.eq(facts.entity, f.entity),
                  ),
                );
              if (existingFact[0]) {
                id = existingFact[0].id;
                if (attribute.type === "text") {
                  const oldUpdate = base64.toByteArray(
                    (existingFact[0]?.data as Fact<typeof f.attribute>["data"])
                      .value,
                  );
                  console.log("mergin updates");
                  const newUpdate = base64.toByteArray(f.data.value);
                  const updateBytes = Y.mergeUpdatesV2([oldUpdate, newUpdate]);
                  data.value = base64.fromByteArray(updateBytes);
                }
              }
            }
            await tx.transaction(
              async (tx2) =>
                await tx2
                  .insert(facts)
                  .values({
                    id: id,
                    entity: f.entity,
                    data: driz.sql`${data}::jsonb`,
                    attribute: f.attribute,
                  })
                  .onConflictDoUpdate({
                    target: facts.id,
                    set: { data: driz.sql`${f.data}::jsonb` },
                  })
                  .catch((e) => {
                    console.log(`error on inserting fact: `, JSON.stringify(e));
                  }),
            );
          },
        });
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
