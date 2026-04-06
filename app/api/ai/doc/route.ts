import { NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "supabase/pool";
import {
  authenticateToken,
  resolvePageEntity,
  getPageBlocks,
  getAllFactsForEntities,
  blocksToMarkdown,
  extractPlaintext,
} from "../lib";

export async function GET(req: NextRequest) {
  let auth = await authenticateToken(req);
  if (auth instanceof Response) return auth;

  let pageParam = req.nextUrl.searchParams.get("page");

  let client = await pool.connect();
  try {
    let db = drizzle(client);
    return await db.transaction(async (tx) => {
      let pageEntity = await resolvePageEntity(tx, auth.rootEntity, pageParam);
      if (pageEntity instanceof Response) return pageEntity;

      let blocks = await getPageBlocks(tx, pageEntity);

      // Collect all entity IDs we need facts for
      let entityIds = new Set<string>();
      for (let b of blocks) {
        entityIds.add(b.value);
      }
      let allFacts = await getAllFactsForEntities(tx, [...entityIds]);

      // For card blocks, also fetch subpage facts
      let subpages: { id: string; title: string }[] = [];
      for (let b of blocks) {
        if (b.type === "card") {
          let cardFacts = allFacts.filter(
            (f) => f.entity === b.value && f.attribute === "block/card",
          );
          if (cardFacts[0]) {
            let cardEntityId = (cardFacts[0].data as any).value;
            entityIds.add(cardEntityId);
          }
        }
      }

      // Re-fetch with subpage entities included
      allFacts = await getAllFactsForEntities(tx, [...entityIds]);

      // Also fetch subpage block entities for titles
      let subpageBlockEntityIds = new Set<string>();
      for (let b of blocks) {
        if (b.type === "card") {
          let cardFacts = allFacts.filter(
            (f) => f.entity === b.value && f.attribute === "block/card",
          );
          if (cardFacts[0]) {
            let cardEntityId = (cardFacts[0].data as any).value;
            let blockRefs = allFacts
              .filter(
                (f) =>
                  f.entity === cardEntityId && f.attribute === "card/block",
              )
              .sort(
                (a, b) =>
                  (a.data as any).position > (b.data as any).position ? 1 : -1,
              );
            for (let ref of blockRefs) {
              subpageBlockEntityIds.add((ref.data as any).value);
            }
          }
        }
      }

      if (subpageBlockEntityIds.size > 0) {
        let subpageBlockFacts = await getAllFactsForEntities(tx, [
          ...subpageBlockEntityIds,
        ]);
        allFacts = [...allFacts, ...subpageBlockFacts];
      }

      // Build subpages list
      for (let b of blocks) {
        if (b.type === "card") {
          let cardFacts = allFacts.filter(
            (f) => f.entity === b.value && f.attribute === "block/card",
          );
          if (cardFacts[0]) {
            let cardEntityId = (cardFacts[0].data as any).value;
            let blockRefs = allFacts
              .filter(
                (f) =>
                  f.entity === cardEntityId && f.attribute === "card/block",
              )
              .sort(
                (a, b) =>
                  (a.data as any).position > (b.data as any).position ? 1 : -1,
              );
            let title = "";
            if (blockRefs[0]) {
              let firstBlockId = (blockRefs[0].data as any).value;
              let textFact = allFacts.find(
                (f) =>
                  f.entity === firstBlockId && f.attribute === "block/text",
              );
              if (textFact) {
                title = extractPlaintext((textFact.data as any).value);
              }
            }
            subpages.push({ id: cardEntityId, title: title || "Untitled" });
          }
        }
      }

      let markdown = await blocksToMarkdown(blocks, allFacts);

      // Extract document title from first heading
      let titleBlock = blocks.find(
        (b) => b.type === "heading" || b.type === "text",
      );
      let title = "";
      if (titleBlock) {
        let textFact = allFacts.find(
          (f) => f.entity === titleBlock.value && f.attribute === "block/text",
        );
        if (textFact) {
          title = extractPlaintext((textFact.data as any).value);
        }
      }

      return Response.json({ title, markdown, subpages });
    });
  } finally {
    client.release();
  }
}
