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
const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
const db = drizzle(client);

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function RootPage() {
  // Creating a new document
  let { permissionToken, rights, entity, entity_set } = await db.transaction(
    async (tx) => {
      // Create a new entity set
      let [entity_set] = await tx.insert(entity_sets).values({}).returning();
      // Create a root-entity
      let [entity] = await tx
        .insert(entities)
        // And add it to that permission set
        .values({ set: entity_set.id, id: v7() })
        .returning();
      //Create a new permission token
      let [permissionToken] = await tx
        .insert(permission_tokens)
        .values({ root_entity: entity.id })
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

      await tx.insert(facts).values([
        {
          id: v7(),
          entity: entity.id,
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

      return { permissionToken, rights, entity, entity_set };
    },
  );

  redirect(`/${permissionToken.id}?focusFirstBlock`);
}
