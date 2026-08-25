import { drizzle } from "drizzle-orm/node-postgres";
import { sql, type SQL } from "drizzle-orm";
import { v7 } from "uuid";
import { pool } from "supabase/pool";

export type LeafletFact = { entity: string; attribute: string; data: unknown };

// Insert a new leaflet: an entity set holding `entityIds`, a permission token
// with full rights rooted at `rootEntityId`, and `facts`. All inserts run in a
// single statement (FK checks fire at end-of-statement and see rows from
// sibling CTEs); callers can append a tail CTE (e.g. to link the new token to
// something) for the same round trip.
export async function insertLeaflet({
  rootEntityId,
  entityIds,
  facts,
  title = null,
  description = null,
  tailCte,
}: {
  rootEntityId: string;
  entityIds: string[];
  facts: LeafletFact[];
  title?: string | null;
  description?: string | null;
  tailCte?: (ids: { permTokenId: string; rootEntityId: string }) => SQL;
}): Promise<{ permTokenId: string }> {
  const entitySetId = v7();
  const permTokenId = v7();

  const entityValues = sql.join(
    entityIds.map((id) => sql`(${id}, ${entitySetId})`),
    sql`, `,
  );
  const factValues = sql.join(
    facts.map(
      (f) =>
        sql`(${v7()}, ${f.entity}, ${f.attribute}, ${JSON.stringify(f.data)}::jsonb)`,
    ),
    sql`, `,
  );
  const tail = tailCte?.({ permTokenId, rootEntityId }) ?? sql``;

  const client = await pool.connect();
  const db = drizzle(client);
  try {
    await db.execute(sql`
      WITH new_set AS (
        INSERT INTO entity_sets (id) VALUES (${entitySetId})
      ),
      new_entities AS (
        INSERT INTO entities (id, set) VALUES ${entityValues}
      ),
      new_token AS (
        INSERT INTO permission_tokens (id, root_entity, title, description)
        VALUES (${permTokenId}, ${rootEntityId}, ${title}, ${description})
      ),
      new_rights AS (
        INSERT INTO permission_token_rights
          (token, entity_set, read, write, create_token, change_entity_set)
        VALUES (${permTokenId}, ${entitySetId}, true, true, true, true)
      )${
        facts.length > 0
          ? sql`, new_facts AS (
        INSERT INTO facts (id, entity, attribute, data) VALUES ${factValues}
      )`
          : sql``
      }${tail}
      SELECT 1
    `);
  } finally {
    client.release();
  }

  return { permTokenId };
}
