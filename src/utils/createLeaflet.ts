import { drizzle } from "drizzle-orm/node-postgres";
import { sql, type SQL } from "drizzle-orm";
import { v7 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import { pool } from "supabase/pool";
import { createYjsText } from "src/utils/createYjsText";

export type DefaultBlockType = "h1" | "text" | "posts-list" | "signup";

// A block to seed into a new leaflet. Either a bare type, or a text block with
// pre-filled content.
export type DefaultBlockSpec =
  | DefaultBlockType
  | { type: "text"; content: string };

export type FactInput = { attribute: string; data: unknown };

type FactRow = FactInput & { id: string; entity: string };

// Create a leaflet: entity set, entities, permission token + rights, and a
// root entity with one seeded page. All inserts run in a single statement (FK
// checks fire at end-of-statement and see rows from sibling CTEs); callers can
// append a tail CTE (e.g. to link the new token to something) for the same
// round trip.
export async function createLeaflet({
  pageType,
  firstBlocks,
  rootFacts = [],
  pageFacts = [],
  tailCte,
}: {
  pageType: "canvas" | "doc";
  firstBlocks?: DefaultBlockSpec[];
  rootFacts?: FactInput[];
  pageFacts?: FactInput[];
  tailCte?: (ids: { permTokenId: string; rootEntityId: string }) => SQL;
}): Promise<{
  permTokenId: string;
  rootEntityId: string;
  firstPageId: string;
}> {
  // Pre-generate every UUID so all inserts can run in one round trip with no
  // RETURNING-driven data dependencies between statements.
  const entitySetId = v7();
  const permTokenId = v7();
  const rootEntityId = v7();
  const firstPageId = v7();

  const factRows: FactRow[] = [
    {
      id: v7(),
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: firstPageId, position: "a0" },
    },
    ...rootFacts.map((f) => ({ id: v7(), entity: rootEntityId, ...f })),
    ...pageFacts.map((f) => ({ id: v7(), entity: firstPageId, ...f })),
  ];

  let blockEntityIds: string[];
  if (pageType === "canvas") {
    const blockId = v7();
    blockEntityIds = [blockId];
    factRows.push(
      {
        id: v7(),
        entity: firstPageId,
        attribute: "page/type",
        data: { type: "page-type-union", value: "canvas" },
      },
      {
        id: v7(),
        entity: firstPageId,
        attribute: "canvas/block",
        data: {
          type: "spatial-reference",
          value: blockId,
          position: { x: 8, y: 12 },
        },
      },
      {
        id: v7(),
        entity: blockId,
        attribute: "block/type",
        data: { type: "block-type-union", value: "text" },
      },
    );
  } else {
    const blockSpecs: DefaultBlockSpec[] = firstBlocks ?? ["h1"];
    blockEntityIds = blockSpecs.map(() => v7());
    let prevPosition: string | null = null;
    blockSpecs.forEach((spec, i) => {
      const entity = blockEntityIds[i];
      const position = generateKeyBetween(prevPosition, null);
      prevPosition = position;
      const type = typeof spec === "string" ? spec : spec.type;
      factRows.push({
        id: v7(),
        entity: firstPageId,
        attribute: "card/block",
        data: { type: "ordered-reference", value: entity, position },
      });
      if (type === "h1") {
        factRows.push(
          {
            id: v7(),
            entity,
            attribute: "block/type",
            data: { type: "block-type-union", value: "heading" },
          },
          {
            id: v7(),
            entity,
            attribute: "block/heading-level",
            data: { type: "number", value: 1 },
          },
        );
      } else {
        factRows.push({
          id: v7(),
          entity,
          attribute: "block/type",
          data: { type: "block-type-union", value: type },
        });
        if (typeof spec !== "string" && spec.content) {
          factRows.push({
            id: v7(),
            entity,
            attribute: "block/text",
            data: { type: "text", value: createYjsText(spec.content) },
          });
        }
      }
    });
  }

  const entityIds = [rootEntityId, firstPageId, ...blockEntityIds];

  const entityValues = sql.join(
    entityIds.map((id) => sql`(${id}, ${entitySetId})`),
    sql`, `,
  );
  const factValues = sql.join(
    factRows.map(
      (f) =>
        sql`(${f.id}, ${f.entity}, ${f.attribute}, ${JSON.stringify(f.data)}::jsonb)`,
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
        INSERT INTO permission_tokens (id, root_entity)
        VALUES (${permTokenId}, ${rootEntityId})
      ),
      new_rights AS (
        INSERT INTO permission_token_rights
          (token, entity_set, read, write, create_token, change_entity_set)
        VALUES (${permTokenId}, ${entitySetId}, true, true, true, true)
      ),
      new_facts AS (
        INSERT INTO facts (id, entity, attribute, data) VALUES ${factValues}
      )${tail}
      SELECT 1
    `);
  } finally {
    client.release();
  }

  return { permTokenId, rootEntityId, firstPageId };
}
