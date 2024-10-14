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
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);

export async function submitComment(
  commentLeaflet: { id: string },
  discussionEntity: string,
  discussionLeafletRoot: string,
) {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*)")
    .eq("id", commentLeaflet.id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data) return { title: "Leaflet not found" };
  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let firstPage = (
    initialFacts.find((f) => f.attribute === "root/page") as Fact<"root/page">
  ).data.value;
  let actual_facts = initialFacts.filter((f) => f.entity !== rootEntity);

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

  let newFacts = [] as Array<Pick<Fact<any>, "entity" | "attribute" | "data">>;
  for (let fact of initialFacts) {
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
    newFacts.push({ entity, attribute: fact.attribute, data });
  }

  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  db.transaction(async (tx) => {
    let [entity] = await tx
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.id, discussionEntity),
          eq(facts.attribute, "page/type"),
        ),
      )
      .innerJoin(facts, eq(facts.entity, entities.id));
    let fact = entity.facts as Fact<"page/type">;
    console.log(entity);
    if (!entity || fact.data.value !== "discussion") {
      console.log("not a discussion entity!", entity);
      return;
    }

    // Create a new entity set
    await tx
      .insert(entities)
      .values(newEntities.map((e) => ({ id: e, set: entity.entities.set })));
    await tx.insert(facts).values(
      newFacts.map((f) => ({
        id: v7(),
        entity: f.entity,
        attribute: f.attribute,
        data: sql`${f.data}`,
      })),
    );

    // create a new fact associating the reply with the discussion.
    let discussionRootCard = oldEntityIDToNewID[firstPage];
    await tx.insert(facts).values([
      {
        id: v7(),
        entity: discussionEntity,
        attribute: "discussion/reply",
        data: sql`${{ type: "reference", value: discussionRootCard }}`,
      },
      {
        id: v7(),
        entity: discussionRootCard,
        attribute: "reply/created-at",
        data: sql`${{ type: "string", value: new Date().toISOString() }}`,
      },
      {
        id: v7(),
        entity: discussionRootCard,
        attribute: "reply/sender",
        data: sql`${{ type: "string", value: "John Doe" }}`,
      },
    ]);
  });

  let channel = supabase.channel(`rootEntity:${discussionLeafletRoot}`);
  await channel.send({
    type: "broadcast",
    event: "poke",
    payload: { message: "poke" },
  });
  supabase.removeChannel(channel);
}
