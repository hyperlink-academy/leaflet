"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import {
  entities,
  permission_tokens,
  permission_token_rights,
  entity_sets,
  facts,
} from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { v7 } from "uuid";
import { sql } from "drizzle-orm";

export async function createNewLeaflet(
  pageType: "canvas" | "doc",
  redirectUser: boolean,
) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);
  let { permissionToken } = await db.transaction(async (tx) => {
    // Create a new entity set
    let [entity_set] = await tx.insert(entity_sets).values({}).returning();
    // Create a root-entity

    let [root_entity] = await tx
      .insert(entities)
      // And add it to that permission set
      .values({ set: entity_set.id, id: v7() })
      .returning();
    let [first_page] = await tx
      .insert(entities)
      // And add it to that permission set
      .values({ set: entity_set.id, id: v7() })
      .returning();
    //Create a new permission token
    let [permissionToken] = await tx
      .insert(permission_tokens)
      .values({ root_entity: root_entity.id })
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

    let [blockEntity] = await tx
      .insert(entities)
      // And add it to that permission set
      .values({ set: entity_set.id, id: v7() })
      .returning();
    await tx.insert(facts).values({
      id: v7(),
      entity: first_page.id,
      attribute: "root/page",
      data: sql`${{ type: "ordered-reference", value: first_page, position: "a0" }}`,
    });

    if (pageType === "canvas") {
      await tx.insert(facts).values([
        {
          id: v7(),
          entity: first_page.id,
          attribute: "page/type",
          data: sql`${{ type: "page-type-union", value: "canvas" }}`,
        },
        {
          id: v7(),
          entity: first_page.id,
          attribute: "canvas/block",
          data: sql`${{ type: "spatial-reference", value: blockEntity.id, position: { x: 8, y: 12 } }}::jsonb`,
        },
        {
          id: v7(),
          entity: blockEntity.id,
          attribute: "block/type",
          data: sql`${{ type: "block-type-union", value: "text" }}::jsonb`,
        },
      ]);
    } else {
      await tx.insert(facts).values([
        {
          id: v7(),
          entity: first_page.id,
          attribute: "card/block",
          data: sql`${{ type: "ordered-reference", value: blockEntity.id, position: "a0" }}::jsonb`,
        },
        {
          id: v7(),
          entity: blockEntity.id,
          attribute: "block/type",
          data: sql`${{ type: "block-type-union", value: "heading" }}::jsonb`,
        },
        {
          id: v7(),
          entity: blockEntity.id,
          attribute: "block/heading-level",
          data: sql`${{ type: "number", value: 1 }}::jsonb`,
        },
      ]);
    }

    return { permissionToken, rights, root_entity, entity_set };
  });

  client.end();
  if (redirectUser) redirect(`/${permissionToken.id}?focusFirstBlock`);
  return permissionToken.id;
}
