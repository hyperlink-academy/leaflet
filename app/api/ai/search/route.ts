import { NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "supabase/pool";
import {
  authenticateToken,
  resolvePageEntity,
  getPageBlocks,
  getAllFactsForEntities,
  extractPlaintext,
} from "../lib";

export async function GET(req: NextRequest) {
  let auth = await authenticateToken(req);
  if (auth instanceof Response) return auth;

  let query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  let pageParam = req.nextUrl.searchParams.get("page");
  let queryLower = query.toLowerCase();

  let client = await pool.connect();
  try {
    let db = drizzle(client);
    return await db.transaction(async (tx) => {
      let pageEntity = await resolvePageEntity(tx, auth.rootEntity, pageParam);
      if (pageEntity instanceof Response) return pageEntity;

      let blocks = await getPageBlocks(tx, pageEntity);
      let entityIds = blocks.map((b) => b.value);
      let allFacts = await getAllFactsForEntities(tx, entityIds);

      let results: {
        blockId: string;
        type: string;
        text: string;
        language?: string;
      }[] = [];

      for (let b of blocks) {
        if (
          b.type === "text" ||
          b.type === "heading" ||
          b.type === "blockquote"
        ) {
          let textFact = allFacts.find(
            (f) => f.entity === b.value && f.attribute === "block/text",
          );
          if (textFact) {
            let plaintext = extractPlaintext((textFact.data as any).value);
            if (plaintext.toLowerCase().includes(queryLower)) {
              results.push({ blockId: b.value, type: b.type, text: plaintext });
            }
          }
        } else if (b.type === "code") {
          let codeFact = allFacts.find(
            (f) => f.entity === b.value && f.attribute === "block/code",
          );
          if (codeFact) {
            let code = (codeFact.data as any).value as string;
            if (code.toLowerCase().includes(queryLower)) {
              let langFact = allFacts.find(
                (f) =>
                  f.entity === b.value && f.attribute === "block/code-language",
              );
              let language = langFact
                ? ((langFact.data as any).value as string)
                : undefined;
              results.push({
                blockId: b.value,
                type: b.type,
                text: code,
                ...(language ? { language } : {}),
              });
            }
          }
        }
      }

      return Response.json({ results });
    });
  } finally {
    client.release();
  }
}
