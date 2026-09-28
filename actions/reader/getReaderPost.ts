"use server";

import { AtUri } from "@atproto/syntax";
import {
  loadPostPage,
  type LoadedPostPage,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/loadPostPage";

// Same payload the published post route renders from — members-only content
// arrives already truncated and unlocks through getUnlockedPost as it does
// there.
export async function getReaderPost(
  document_uri: string,
): Promise<LoadedPostPage | null> {
  let uri: AtUri;
  try {
    uri = new AtUri(document_uri);
  } catch {
    return null;
  }
  return loadPostPage({
    did: uri.host,
    rkey: uri.rkey,
    // PubCodeBlock highlights on mount; the prerender only matters to SSR HTML.
    skipCodeBlocks: true,
  });
}
