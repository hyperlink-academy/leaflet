import type { SQL } from "drizzle-orm";
import { v7 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import { createYjsText } from "src/utils/createYjsText";
import { insertLeaflet, type LeafletFact } from "src/utils/insertLeaflet";
import {
  POST_HEADER_BLOCK_POSITION,
  POST_HEADER_BLOCK_WIDTH,
} from "src/utils/postHeaderBlock";

export type DefaultBlockType = "h1" | "text" | "posts-list" | "signup";

// A block to seed into a new leaflet. Either a bare type, or a text block with
// pre-filled content.
export type DefaultBlockSpec =
  | DefaultBlockType
  | { type: "text"; content: string };

export type FactInput = { attribute: string; data: unknown };

// Create a leaflet with a root entity and one seeded page.
export async function createLeaflet({
  pageType,
  firstBlocks,
  rootFacts = [],
  pageFacts = [],
  tailCte,
  canvasPostHeader,
}: {
  pageType: "canvas" | "doc";
  firstBlocks?: DefaultBlockSpec[];
  rootFacts?: FactInput[];
  pageFacts?: FactInput[];
  tailCte?: (ids: { permTokenId: string; rootEntityId: string }) => SQL;
  // Canvas posts in a publication show their metadata in a post header block.
  canvasPostHeader?: boolean;
}): Promise<{
  permTokenId: string;
  rootEntityId: string;
  firstPageId: string;
}> {
  const rootEntityId = v7();
  const firstPageId = v7();

  const facts: LeafletFact[] = [
    {
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: firstPageId, position: "a0" },
    },
    ...rootFacts.map((f) => ({ entity: rootEntityId, ...f })),
    ...pageFacts.map((f) => ({ entity: firstPageId, ...f })),
  ];

  let blockEntityIds: string[];
  if (pageType === "canvas") {
    const blockId = v7();
    blockEntityIds = [blockId];
    facts.push(
      {
        entity: firstPageId,
        attribute: "page/type",
        data: { type: "page-type-union", value: "canvas" },
      },
      {
        entity: firstPageId,
        attribute: "canvas/block",
        data: {
          type: "spatial-reference",
          value: blockId,
          // Leave room for the post header block above it.
          position: { x: 8, y: canvasPostHeader ? 200 : 12 },
        },
      },
      {
        entity: blockId,
        attribute: "block/type",
        data: { type: "block-type-union", value: "text" },
      },
      {
        entity: blockId,
        attribute: "canvas/block/stack-order",
        data: { type: "string", value: generateKeyBetween(null, null) },
      },
    );
    if (canvasPostHeader) {
      const headerId = v7();
      blockEntityIds.push(headerId);
      facts.push(
        {
          entity: firstPageId,
          attribute: "canvas/block",
          data: {
            type: "spatial-reference",
            value: headerId,
            position: POST_HEADER_BLOCK_POSITION,
          },
        },
        {
          entity: headerId,
          attribute: "block/type",
          data: { type: "block-type-union", value: "post-header" },
        },
        {
          entity: headerId,
          attribute: "canvas/block/width",
          data: { type: "number", value: POST_HEADER_BLOCK_WIDTH },
        },
        {
          entity: headerId,
          attribute: "canvas/block/stack-order",
          data: {
            type: "string",
            value: generateKeyBetween(generateKeyBetween(null, null), null),
          },
        },
      );
    }
  } else {
    const blockSpecs: DefaultBlockSpec[] = firstBlocks ?? ["h1"];
    blockEntityIds = blockSpecs.map(() => v7());
    let prevPosition: string | null = null;
    blockSpecs.forEach((spec, i) => {
      const entity = blockEntityIds[i];
      const position = generateKeyBetween(prevPosition, null);
      prevPosition = position;
      const type = typeof spec === "string" ? spec : spec.type;
      facts.push({
        entity: firstPageId,
        attribute: "card/block",
        data: { type: "ordered-reference", value: entity, position },
      });
      if (type === "h1") {
        facts.push(
          {
            entity,
            attribute: "block/type",
            data: { type: "block-type-union", value: "heading" },
          },
          {
            entity,
            attribute: "block/heading-level",
            data: { type: "number", value: 1 },
          },
        );
      } else {
        facts.push({
          entity,
          attribute: "block/type",
          data: { type: "block-type-union", value: type },
        });
        if (typeof spec !== "string" && spec.content) {
          facts.push({
            entity,
            attribute: "block/text",
            data: { type: "text", value: createYjsText(spec.content) },
          });
        }
      }
    });
  }

  const { permTokenId } = await insertLeaflet({
    rootEntityId,
    entityIds: [rootEntityId, firstPageId, ...blockEntityIds],
    facts,
    tailCte,
  });
  return { permTokenId, rootEntityId, firstPageId };
}
