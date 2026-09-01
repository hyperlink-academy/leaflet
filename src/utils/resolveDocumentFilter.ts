import { cache } from "react";
import { supabaseServerClient } from "supabase/serverClient";
import { documentUriFilter } from "src/utils/uriHelpers";

/**
 * Resolves the trailing segment of a publication post URL to a documents
 * query filter. Documents publish under the `path` in their record — usually
 * "/<rkey>", but records written by other clients can use any path — so match
 * the record path within the publication first and fall back to treating the
 * segment as an rkey.
 *
 * Takes the caller's already-resolved publication uri so the lookup stays an
 * indexed scan over that publication's membership rows — a miss (every 404
 * probe) costs the same as a hit.
 *
 * Per-request memoized: both generateMetadata and the page body resolve the
 * same segment, and this used to be one of the heavier queries in the post
 * path.
 */
export const resolveDocumentFilter = cache(async function resolveDocumentFilter(
  did: string,
  publicationUri: string,
  segment: string,
): Promise<string> {
  const path = segment.startsWith("/") ? segment : "/" + segment;
  const { data } = await supabaseServerClient
    .from("documents_in_publications")
    .select("document, documents!inner(uri)")
    .eq("publication", publicationUri)
    // Record paths may be stored with or without the leading slash
    .in("documents.data->>path", [path, path.slice(1)]);

  // A path can legally appear on more than one document; the newest uri wins.
  const uri = data?.reduce<string | undefined>(
    (max, row) => (!max || row.document > max ? row.document : max),
    undefined,
  );
  return uri ? `uri.eq.${uri}` : documentUriFilter(did, segment);
});
