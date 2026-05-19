import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "supabase/database.types";
import { parseStandardSitePostInput } from "components/Blocks/StandardSitePostBlock/parseStandardSitePostInput";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";

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

  // Find publications whose URL matches this origin
  const { data: publications } = await supabase
    .from("publications")
    .select("uri, record");
  if (!publications) return null;

  const matchedPub = publications.find((p) => {
    const normalized = normalizePublicationRecord(p.record);
    if (!normalized?.url) return false;
    return normalized.url.replace(/\/$/, "") === origin;
  });
  if (!matchedPub) return null;

  // Find documents in that publication where data.path matches pathOnly
  const { data: docsInPub } = await supabase
    .from("documents_in_publications")
    .select("documents(uri, data)")
    .eq("publication", matchedPub.uri);

  if (!docsInPub) return null;

  for (const row of docsInPub) {
    const doc = row.documents;
    if (!doc) continue;
    const normalized = normalizeDocumentRecord(doc.data as Json, doc.uri);
    if (!normalized) continue;
    const docPath = normalized.path
      ? normalized.path.startsWith("/")
        ? normalized.path
        : `/${normalized.path}`
      : null;
    if (docPath === pathOnly) return doc.uri;
  }
  return null;
}
