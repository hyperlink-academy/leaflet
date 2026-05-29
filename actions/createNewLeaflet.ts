"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { redirect } from "next/navigation";
import { v7 } from "uuid";
import { sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { cookies } from "next/headers";
import { pool } from "supabase/pool";

export type DefaultBlockType = "h1" | "text" | "posts-list" | "signup";

type FactRow = {
  id: string;
  entity: string;
  attribute: string;
  data: unknown;
};

export async function createNewLeaflet({
  pageType,
  redirectUser,
  firstBlockType,
  welcomeModal,
  addToHome,
  firstBlocks,
  addToHomepage = true,
}: {
  pageType: "canvas" | "doc";
  redirectUser: boolean;
  firstBlockType?: "h1" | "text";
  welcomeModal?: boolean;
  addToHome?: boolean;
  firstBlocks?: DefaultBlockType[];
  addToHomepage?: boolean;
}) {
  let auth_token = (await cookies()).get("auth_token")?.value;

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
    {
      id: v7(),
      entity: rootEntityId,
      attribute: "theme/page-leaflet-watermark",
      data: { type: "boolean", value: true },
    },
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
    const blockSpecs: DefaultBlockType[] =
      firstBlocks ?? [firstBlockType === "text" ? "text" : "h1"];
    blockEntityIds = blockSpecs.map(() => v7());
    let prevPosition: string | null = null;
    blockSpecs.forEach((spec, i) => {
      const entity = blockEntityIds[i];
      const position = generateKeyBetween(prevPosition, null);
      prevPosition = position;
      factRows.push({
        id: v7(),
        entity: firstPageId,
        attribute: "card/block",
        data: { type: "ordered-reference", value: entity, position },
      });
      if (spec === "h1") {
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
          data: { type: "block-type-union", value: spec },
        });
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

  // Optional homepage insert as a tail CTE; resolves auth_token → identity in
  // the same round trip and inserts nothing when the token is missing/invalid.
  const homepageCte =
    auth_token && addToHomepage
      ? sql`, homepage_insert AS (
          INSERT INTO permission_token_on_homepage (token, identity)
          SELECT ${permTokenId}, identities.id
          FROM email_auth_tokens
          JOIN identities ON email_auth_tokens.identity = identities.id
          WHERE email_auth_tokens.id = ${auth_token}
            AND email_auth_tokens.confirmed = true
        )`
      : sql``;

  // All inserts in a single statement. FK checks fire at end-of-statement and
  // see rows inserted in sibling data-modifying CTEs, so ordering is safe.
  // Atomicity comes from the statement itself — no explicit transaction needed.
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
      )${homepageCte}
      SELECT 1
    `);
  } finally {
    client.release();
  }

  if (redirectUser)
    redirect(
      `/${permTokenId}?focusFirstBlock${welcomeModal ? "&welcomeModal" : ""}${addToHome ? "&addToHome" : ""}`,
    );
  return permTokenId;
}
