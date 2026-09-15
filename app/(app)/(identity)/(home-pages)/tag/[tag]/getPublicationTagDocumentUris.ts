import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { AtUri } from "@atproto/api";
import { pool } from "supabase/pool";

export async function getPublicationTagDocumentUris(
  tag: string,
  publicationUri: string,
): Promise<string[]> {
  const publicationUris = publicationUriVariants(publicationUri);
  const client = await pool.connect();
  try {
    const db = drizzle(client);
    const rows = await db.execute(sql`
      SELECT d.uri
      FROM "public"."document_tags" dt
      JOIN "public"."documents_in_publications" dip ON dip.document = dt.uri
      JOIN "public"."documents" d ON d.uri = dt.uri
      WHERE dt.tag = ${tag}
        AND dip.publication IN (${sql.join(
          publicationUris.map((u) => sql`${u}`),
          sql`, `,
        )})
      ORDER BY d.sort_date DESC NULLS LAST
    `);
    return rows.rows.map((row: any) => row.uri as string);
  } catch (e) {
    console.error("Error fetching publication tag documents:", e);
    return [];
  } finally {
    client.release();
  }
}

function publicationUriVariants(publicationUri: string): string[] {
  try {
    const { host, rkey } = new AtUri(publicationUri);
    return [
      `at://${host}/pub.leaflet.publication/${rkey}`,
      `at://${host}/site.standard.publication/${rkey}`,
    ];
  } catch {
    return [publicationUri];
  }
}
