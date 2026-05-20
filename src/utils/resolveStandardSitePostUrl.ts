import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "supabase/database.types";
import { parseStandardSitePostInput } from "components/Blocks/StandardSitePostBlock/parseStandardSitePostInput";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";

/**
 * Resolve a URL or AT URI to a standard-site-post AT URI by checking our DB.
 * Handles at:// URIs, leaflet.pub patterns synchronously, and custom-domain
 * URLs via DB lookup against the publications + documents tables.
 */
export async function resolveStandardSitePostUrl(
  input: string,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const direct = parseStandardSitePostInput(input);
  if (direct) {
    const { data } = await supabase
      .from("documents")
      .select("uri")
      .eq("uri", direct)
      .maybeSingle();
    return data?.uri ?? null;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const origin = `${url.protocol}//${url.host}`;
  const pathOnly = url.pathname.replace(/\/$/, "") || "/";

  // Find a publication whose URL matches this origin. Supports both
  // pub.leaflet.publication (base_path) and site.standard.publication (url).
  // Descending uri order prefers site.standard.publication over pub.leaflet.publication.
  const { data: publication } = await supabase
    .from("publications")
    .select("uri")
    .or(
      `record->>base_path.eq.${url.host},record->>url.eq.${origin},record->>url.eq.${origin}/`,
    )
    .order("uri", { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log(publication);
  if (!publication) return null;

  // Find documents in that publication where data.path matches pathOnly
  const { data: docsInPub } = await supabase
    .from("documents_in_publications")
    .select("documents(uri, data)")
    .eq("publication", publication.uri);

  if (!docsInPub) return null;

  for (const row of docsInPub) {
    const doc = row.documents;
    if (!doc) continue;
    const normalized = normalizeDocumentRecord(doc.data as Json, doc.uri);
    if (!normalized) continue;
    const rawPath = normalized.path
      ? normalized.path.startsWith("/")
        ? normalized.path
        : `/${normalized.path}`
      : null;
    const docPath = rawPath ? rawPath.replace(/\/$/, "") || "/" : null;
    console.log(docPath, pathOnly);
    if (docPath === pathOnly) return doc.uri;
  }
  return null;
}
