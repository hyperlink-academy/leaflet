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
  const requestedPath = url.pathname.replace(/\/$/, "") || "/";
  const requestedUrl = origin + (requestedPath === "/" ? "" : requestedPath);

  // Publications can live at a sub-path (e.g. https://example.com/blog), so we
  // can't match the origin exactly. Prefix-match on the host to gather every
  // publication that could own this URL, then filter to the one whose url is
  // the longest prefix of the requested URL. Supports both
  // pub.leaflet.publication (base_path) and site.standard.publication (url).
  // Descending uri order prefers site.standard.publication over
  // pub.leaflet.publication when base paths are equally specific.
  const { data: publications } = await supabase
    .from("publications")
    .select("uri, record")
    .or(
      [
        `record->>base_path.like.${url.host}*`,
        `record->>url.like.${origin}*`,
      ].join(","),
    )
    .order("uri", { ascending: false });

  if (!publications?.length) return null;

  // Pick the publication whose url is the longest prefix of the requested URL,
  // and compute the document path relative to that publication's base path.
  let best: { uri: string; path: string; urlLength: number } | null = null;
  for (const pub of publications) {
    const normalized = normalizePublicationRecord(pub.record);
    if (!normalized?.url) continue;
    const pubUrl = normalized.url.replace(/\/$/, "");
    if (requestedUrl !== pubUrl && !requestedUrl.startsWith(`${pubUrl}/`))
      continue;
    const basePath = new URL(pubUrl).pathname.replace(/\/$/, "");
    const relative = requestedPath.slice(basePath.length) || "/";
    const path = relative.startsWith("/") ? relative : `/${relative}`;
    if (!best || pubUrl.length > best.urlLength)
      best = { uri: pub.uri, path, urlLength: pubUrl.length };
  }

  if (!best) return null;

  // Find documents in that publication where data.path matches the requested
  // path (relative to the publication's base path).
  const { data: docsInPub } = await supabase
    .from("documents_in_publications")
    .select("documents(uri, data)")
    .eq("publication", best.uri);

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
    if (docPath === best.path) return doc.uri;
  }
  return null;
}
