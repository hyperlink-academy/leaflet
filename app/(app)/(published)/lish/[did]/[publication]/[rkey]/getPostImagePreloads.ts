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

// How much of a post's art is worth warming before the reader opens it. The
// first image is what lands above the fold and decides whether a page turn
// looks instant; the next two cover the start of a scroll. Past that the reader
// is scrolling anyway, and speculative bytes start competing with the page
// they're actually on. A comic page holds one image, so for the case this
// exists for it's a ceiling rather than a target.
const PRELOADED_IMAGES_PER_POST = 3;

/**
 * The first few image URLs of each of the given posts, in document order, ready
 * to be warmed by the client before the reader opens them.
 *
 * The URLs are built exactly as PostContent builds them, so what lands in the
 * browser cache is the same request the neighbour's `<img>` will make — a
 * different transform width would warm bytes nobody asks for.
 */
export async function getPostImagePreloads(
  uris: string[],
): Promise<string[][]> {
  if (uris.length === 0) return [];

  const { data, error } = await supabaseServerClient
    .from("documents")
    .select("uri, data, documents_in_publications(members_only)")
    .in("uri", uris);

  if (error) {
    console.error("[getPostImagePreloads] query error:", error);
    return [];
  }

  const byUri = new Map((data ?? []).map((row) => [row.uri, row]));
  // In the requested order, so the caller's nearest neighbour comes first.
  return uris.map((uri) => {
    const row = byUri.get(uri);
    if (!row) return [];

    const normalized = normalizeDocumentRecord(row.data, row.uri);
    if (!normalized) return [];
    const pages = getDocumentPages(normalized);
    if (!pages) return [];

    // Gated blocks are never served to a reader who can't see them, so their
    // art doesn't get warmed on the way in either.
    if (row.documents_in_publications?.[0]?.members_only)
      truncatePagesAtMembersDelimiter(pages);

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
