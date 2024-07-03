import { drizzle } from "drizzle-orm/postgres-js";
import {
  entities,
  permission_tokens,
  permission_token_rights,
  entity_sets,
} from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { Doc } from "./[doc_id]/Doc";
import { UpdateURL } from "components/UpdateURL";
const client = postgres(process.env.DB_URL as string);
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
        .values({ set: entity_set.id })
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
      return { permissionToken, rights, entity, entity_set };
    },
  );
  // Here i need to pass the permission token instead of the doc_id
  // In the replicache provider I guess I need to fetch the relevant stuff of the permission token?
  return (
    <>
      <UpdateURL url={`/${permissionToken.id}`} />
      <Doc
        doc_id={entity.id}
        token={{ id: permissionToken.id, permission_token_rights: [rights] }}
        initialFacts={[]}
      />
    </>
  );
}
