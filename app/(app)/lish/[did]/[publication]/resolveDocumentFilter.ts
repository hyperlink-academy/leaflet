import { supabaseServerClient } from "supabase/serverClient";
import {
  documentUriFilter,
  publicationNameOrUriFilter,
} from "src/utils/uriHelpers";

/**
 * Resolves the trailing segment of a publication post URL to a documents
 * query filter. Documents publish under the `path` in their record — usually
 * "/<rkey>", but records written by other clients can use any path — so match
 * the record path within the publication first and fall back to treating the
 * segment as an rkey.
 */
export async function resolveDocumentFilter(
  did: string,
  publicationName: string,
  segment: string,
): Promise<string> {
  const path = segment.startsWith("/") ? segment : "/" + segment;
  // plan-checked: KNOWN DEBT — every filter here lives in an !inner embed, so
  // the limit walks documents_in_publications probing publications + documents
  // per row, and scans the whole membership table when the segment matches
  // nothing (every 404 probe). Needs the publication resolved first (callers
  // usually have it) so this can filter on the indexed publication column.
  const { data } = await supabaseServerClient
    .from("documents_in_publications")
    .select(
      "document, documents!inner(uri), publications!inner(uri, name, identity_did)",
    )
    .eq("publications.identity_did", did)
    .or(publicationNameOrUriFilter(did, publicationName), {
      referencedTable: "publications",
    })
    // Record paths may be stored with or without the leading slash
    .in("documents.data->>path", [path, path.slice(1)])
    .order("document", { ascending: false })
    .limit(1);

  const uri = data?.[0]?.document;
  return uri ? `uri.eq.${uri}` : documentUriFilter(did, segment);
}
