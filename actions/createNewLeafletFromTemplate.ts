"use server";

import { createServerClient } from "@supabase/ssr";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextRequest } from "next/server";
import postgres from "postgres";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { Database } from "supabase/database.types";
import { v7 } from "uuid";

import {
  entities,
  permission_tokens,
  permission_token_rights,
  entity_sets,
  facts,
} from "drizzle/schema";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export async function createNewLeafletFromTemplate(
  template_id: string,
  redirectUser?: boolean,
) {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*)")
    .eq("id", template_id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data) return { error: "Leaflet not found" } as const;
  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];

  let oldEntityIDToNewID = {} as { [k: string]: string };
  let oldEntities = initialFacts.reduce((acc, f) => {
    if (!acc.includes(f.entity)) acc.push(f.entity);
    return acc;
  }, [] as string[]);
  let newEntities = [] as string[];

  for (let oldEntity of oldEntities) {
    let newEntity = v7();
    oldEntityIDToNewID[oldEntity] = newEntity;
    newEntities.push(newEntity);
  }

  let newFacts = await Promise.all(
    initialFacts.map(async (fact) => {
      let entity = oldEntityIDToNewID[fact.entity];
      let data = fact.data;
      if (
        data.type === "ordered-reference" ||
        data.type == "spatial-reference" ||
        data.type === "reference"
      ) {
        data.value = oldEntityIDToNewID[data.value];
      }
      if (data.type === "image") {
        let url = data.src.split("?");
        let paths = url[0].split("/");
        let newID = v7();
        await supabase.storage
          .from("minilink-user-assets")
          .copy(paths[paths.length - 1], newID);
        let newPath = [...paths];
        newPath[newPath.length - 1] = newID;
        let newURL = newPath.join("/");
        if (url[1]) newURL += `?${url[1]}`;
        data.src = newURL;
      }
      return { entity, attribute: fact.attribute, data };
    }),
  );

  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  let { permissionToken } = await db.transaction(async (tx) => {
    // Create a new entity set
    let [entity_set] = await tx.insert(entity_sets).values({}).returning();
    await tx
      .insert(entities)
      .values(newEntities.map((e) => ({ id: e, set: entity_set.id })));
    await tx.insert(facts).values(
      newFacts.map((f) => ({
        id: v7(),
        entity: f.entity,
        attribute: f.attribute,
        data: sql`${f.data}`,
      })),
    );

    let [permissionToken] = await tx
      .insert(permission_tokens)
      .values({ root_entity: oldEntityIDToNewID[rootEntity] })
      .returning();

    //and give it all the permission on that entity set
    let [rights] = await tx
      .insert(permission_token_rights)
      .values({
        token: permissionToken.id,
        entity_set: entity_set.id,
        read: true,
        write: true,
        create_token: true,
        change_entity_set: true,
      })
      .returning();

    return { permissionToken, rights, entity_set };
  });

  client.end();
  if (redirectUser) redirect(`/${permissionToken.id}`);
  return { id: permissionToken.id, error: null } as const;
}
