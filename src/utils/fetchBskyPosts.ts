import { Agent, AtpAgent, AppBskyFeedDefs } from "@atproto/api";
import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksBskyPost,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { type $Typed } from "lexicons/api/util";
import { extractBlocksByType } from "app/(app)/lish/[did]/[publication]/[rkey]/extractBlocksByType";

// getPosts accepts at most 25 URIs per call.
export async function fetchBskyPosts(
  agent: Agent,
  uris: string[],
): Promise<AppBskyFeedDefs.PostView[]> {
  const batches: string[][] = [];
  for (let i = 0; i < uris.length; i += 25) {
    batches.push(uris.slice(i, i + 25));
  }
  const responses = await Promise.all(
    batches.map((batch) => agent.getPosts({ uris: batch }, { headers: {} })),
  );
  return responses.flatMap((r) => r.data.posts);
}

// Hydrate the bskyPost blocks of an email render into a map keyed by post URI.
// Hydration is best-effort: any failure returns an empty map so the affected
// blocks fall back to the "not supported" card instead of breaking the send.
export async function hydrateBskyPostBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[],
): Promise<Record<string, AppBskyFeedDefs.PostView>> {
  try {
    const uris = Array.from(
      new Set(
        extractBlocksByType<$Typed<PubLeafletBlocksBskyPost.Main>>(
          blocks,
          ids.PubLeafletBlocksBskyPost,
        ).map((b) => b.block.postRef.uri),
      ),
    );
    if (uris.length === 0) return {};
    const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
    const posts = await fetchBskyPosts(agent, uris);
    return Object.fromEntries(posts.map((p) => [p.uri, p]));
  } catch (e) {
    console.error("[hydrateBskyPostBlocks] failed:", e);
    return {};
  }
}
