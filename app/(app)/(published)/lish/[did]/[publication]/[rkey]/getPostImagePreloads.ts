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
 * The first few image URLs of each of the given posts, in document order,
 * built exactly as PostContent builds them — a different transform width would
 * warm bytes the neighbour's `<img>` never requests.
 */
export async function getPostImagePreloads(
  uris: string[],
  publicationUri?: string,
): Promise<string[][]> {
  if (uris.length === 0) return [];

  const { data, error } = await supabaseServerClient
    .from("documents")
    .select("uri, data, documents_in_publications(publication, members_only)")
    .in("uri", uris);

  if (error) {
    console.error("[getPostImagePreloads] query error:", error);
    return [];
  }

  const byUri = new Map((data ?? []).map((row) => [row.uri, row]));
  return uris.map((uri) => {
    const row = byUri.get(uri);
    if (!row) return [];

    const normalized = normalizeDocumentRecord(row.data, row.uri);
    if (!normalized) return [];
    const pages = getDocumentPages(normalized);
    if (!pages) return [];

    // A post can be gated differently per publication, so this publication's
    // row decides; with no publication to match, the safe read is gated.
    const inPublication = row.documents_in_publications ?? [];
    const membersOnly = publicationUri
      ? inPublication.some(
          (dip) => dip.publication === publicationUri && dip.members_only,
        )
      : inPublication.some((dip) => dip.members_only);
    if (membersOnly) truncatePagesAtMembersDelimiter(pages);

    const did = new AtUri(uri).host;
    const images = pages.flatMap((page) =>
      collectPostImages(
        page as PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main,
        did,
      ),
    );
    return images.slice(0, PRELOADED_IMAGES_PER_POST).map((image) => image.src);
  });
}
