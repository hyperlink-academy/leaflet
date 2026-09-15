import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { pool } from "supabase/pool";
import { TRENDING_RANK } from "src/utils/trendingRank";

// The trending counterpart to get_tag_page_document_uris: same fenced shape —
// a MATERIALIZED CTE that pins the plan to the document_tags tag index, then
// pkey probes into documents — but ordered by TRENDING_RANK instead of
// sort_date, so a tag ranks its posts exactly as /reader/trending ranks the
// global feed. There is no index on the ranking expression for the planner to
// be tempted to walk, so the fence only has to keep the tag lookup from
// becoming a scan; enable_seqscan is set for the transaction the way the SQL
// function sets it for its body.
//
// Written inline rather than as a SQL function so the ranking keeps a single
// definition in TRENDING_RANK. The candidate set is every document carrying
// the tag, so Postgres sorts that many rows — bounded by the tag's own size,
// not by the documents table.
export async function getTagDocumentUrisByTrending(
  tag: string,
  maxCount: number,
): Promise<string[]> {
  const client = await pool.connect();
  try {
    const db = drizzle(client);
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL enable_seqscan = off`);
      const ranked = await tx.execute(sql`
        WITH tag_docs AS MATERIALIZED (
          SELECT dt.uri FROM "public"."document_tags" dt WHERE dt.tag = ${tag}
        )
        SELECT d.uri
        FROM "public"."documents" d
        JOIN tag_docs td ON td.uri = d.uri
        ORDER BY ${TRENDING_RANK} DESC NULLS LAST
        LIMIT ${maxCount}
      `);
      return ranked.rows.map((row: any) => row.uri as string);
    });
  } catch (e) {
    // Fall back to an empty list rather than failing the whole tag view; the
    // caller renders its empty state.
    console.error("Error ranking tag documents by trending:", e);
    return [];
  } finally {
    client.release();
  }
}
