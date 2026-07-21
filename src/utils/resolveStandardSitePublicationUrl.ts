import type { SupabaseClient } from "@supabase/supabase-js";
import { AtUri } from "@atproto/syntax";
import type { Database } from "supabase/database.types";
import { ids } from "lexicons/api/lexicons";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationUriForHost } from "src/utils/publicationForHost";

/**
 * Resolve a URL or AT URI to a standard-site-publication AT URI by checking our
 * DB. Only resolves publication *roots* (never individual posts): leaflet.pub
 * /lish/{did}/{publication} URLs, at:// publication URIs, and custom-domain
 * homepages.
 */
export async function resolveStandardSitePublicationUrl(
  input: string,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct at:// publication URI
  if (trimmed.startsWith("at://")) {
    try {
      const aturi = new AtUri(trimmed);
      if (
        aturi.collection === ids.SiteStandardPublication ||
        aturi.collection === ids.PubLeafletPublication
      ) {
        const { data } = await supabase
          .from("publications")
          .select("uri")
          .eq("uri", trimmed)
          .maybeSingle();
        return data?.uri ?? null;
      }
    } catch {}
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // https://leaflet.pub/lish/{did}/{publication} — a publication root has
  // exactly two path segments after /lish (a third segment means it's a post).
  const lishMatch = url.pathname.match(/^\/lish\/([^/]+)\/([^/]+)\/?$/);
  if (lishMatch) {
    const [, did, nameOrRkey] = lishMatch;
    const candidates = new Set<string>();
    try {
      candidates.add(
        AtUri.make(did, ids.SiteStandardPublication, nameOrRkey).toString(),
      );
      candidates.add(
        AtUri.make(did, ids.PubLeafletPublication, nameOrRkey).toString(),
      );
    } catch {}
    const { data } = await supabase
      .from("publications")
      .select("uri, record")
      .eq("identity_did", did)
      // Descending uri order prefers site.standard over pub.leaflet.
      .order("uri", { ascending: false });
    if (!data?.length) return null;
    const decodedName = decodeURIComponent(nameOrRkey);
    for (const pub of data) {
      if (candidates.has(pub.uri)) return pub.uri;
      const normalized = normalizePublicationRecord(pub.record);
      if (normalized?.name === decodedName) return pub.uri;
    }
    return null;
  }

  // Custom domain: match a publication whose configured url is exactly the
  // requested URL (the homepage), so post paths never resolve as a publication.
  const origin = `${url.protocol}//${url.host}`;
  const requestedPath = url.pathname.replace(/\/$/, "") || "/";
  const requestedUrl = origin + (requestedPath === "/" ? "" : requestedPath);

  const [hostPubUri, { data: publications }] = await Promise.all([
    requestedPath === "/" ? publicationUriForHost(url.host, supabase) : null,
    supabase
      .from("publications")
      .select("uri, record")
      .or(
        [
          `record->>base_path.like.${url.host}*`,
          `record->>url.like.${origin}*`,
        ].join(","),
      )
      .order("uri", { ascending: false }),
  ]);
  if (hostPubUri) return hostPubUri;

  if (!publications?.length) return null;

  for (const pub of publications) {
    const normalized = normalizePublicationRecord(pub.record);
    if (!normalized?.url) continue;
    if (requestedUrl === normalized.url.replace(/\/$/, "")) return pub.uri;
  }
  return null;
}
