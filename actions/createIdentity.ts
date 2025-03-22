import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  entities,
  permission_tokens,
  permission_token_rights,
  entity_sets,
  facts,
  identities,
} from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { v7 } from "uuid";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
export async function createIdentity(
  db: PostgresJsDatabase,
  data?: { email?: string; atp_did?: string },
) {
  return db.transaction(async (tx) => {
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
    let [identity] = await tx
      .insert(identities)
      .values({ home_page: permissionToken.id, ...data })
      .returning();
    return identity;
  });
}
