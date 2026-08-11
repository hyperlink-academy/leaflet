import { AtUri } from "@atproto/api";
import {
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getDocumentPages,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";
import { truncatePagesAtMembersDelimiter } from "src/membership";
import { collectPostImages } from "./collectPostImages";

const PRELOADED_IMAGES_PER_POST = 2;

/**
 * The first few image URLs of each of the given posts, keyed by post uri and
 * in document order, built exactly as PostContent builds them — a different
 * transform width would warm bytes the neighbour's `<img>` never requests.
 */
export async function getPostImagePreloads(
  uris: string[],
  publicationUri: string,
): Promise<Map<string, string[]>> {
  const preloads = new Map<string, string[]>();
  if (uris.length === 0) return preloads;

  // A post can be gated differently per publication, so the embed is filtered
  // to this publication's membership row.
  const { data, error } = await supabaseServerClient
    .from("documents")
    .select("uri, data, documents_in_publications(members_only)")
    .in("uri", uris)
    .eq("documents_in_publications.publication", publicationUri);

  if (error) {
    console.error("[getPostImagePreloads] query error:", error);
    return preloads;
  }

  for (const row of data ?? []) {
    const normalized = normalizeDocumentRecord(row.data, row.uri);
    if (!normalized) continue;
    const pages = getDocumentPages(normalized);
    if (!pages) continue;

    if (row.documents_in_publications.some((dip) => dip.members_only))
      truncatePagesAtMembersDelimiter(pages);

    const did = new AtUri(row.uri).host;
    const images = pages.flatMap((page) =>
      collectPostImages(
        page as PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main,
        did,
      ),
    );
    preloads.set(
      row.uri,
      images.slice(0, PRELOADED_IMAGES_PER_POST).map((image) => image.src),
    );
  }
  return preloads;
}
