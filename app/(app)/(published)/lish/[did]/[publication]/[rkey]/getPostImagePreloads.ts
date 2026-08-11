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

export async function getPostImagePreloads(
  posts: { uri: string; membersOnly: boolean }[],
): Promise<Map<string, string[]>> {
  const preloads = new Map<string, string[]>();
  if (posts.length === 0) return preloads;

  const { data, error } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .in(
      "uri",
      posts.map((p) => p.uri),
    );

  if (error) {
    console.error("[getPostImagePreloads] query error:", error);
    return preloads;
  }

  const membersOnly = new Map(posts.map((p) => [p.uri, p.membersOnly]));
  for (const row of data ?? []) {
    const normalized = normalizeDocumentRecord(row.data, row.uri);
    if (!normalized) continue;
    const pages = getDocumentPages(normalized);
    if (!pages) continue;

    if (membersOnly.get(row.uri)) truncatePagesAtMembersDelimiter(pages);

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
