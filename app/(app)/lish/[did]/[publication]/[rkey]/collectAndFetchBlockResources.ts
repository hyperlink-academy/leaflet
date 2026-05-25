import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksPoll,
  PubLeafletBlocksStandardSitePost,
  PubLeafletPagesLinearDocument,
  PubLeafletPagesCanvas,
} from "lexicons/api";
import { type $Typed } from "lexicons/api/util";
import { AtpAgent, AppBskyFeedDefs } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import {
  get_standard_site_posts,
  type StandardSitePostData,
} from "app/api/rpc/[command]/get_standard_site_posts";
import { extractBlocksByType } from "./extractBlocksByType";
import { extractCodeBlocks } from "./extractCodeBlocks";
import { fetchPollData, type PollData } from "./fetchPollData";

type Page =
  | PubLeafletPagesLinearDocument.Main
  | PubLeafletPagesCanvas.Main;

export async function collectAndFetchBlockResources({
  agent,
  pages,
}: {
  agent: AtpAgent;
  pages: Page[];
}): Promise<{
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  pollData: PollData[];
  prerenderedCodeBlocks: Map<string, string>;
}> {
  const allBlocks: PubLeafletPagesLinearDocument.Block[] = pages.flatMap(
    (p) => (p as PubLeafletPagesLinearDocument.Main).blocks ?? [],
  );

  const bskyPostBlocks = extractBlocksByType<
    $Typed<PubLeafletBlocksBskyPost.Main>
  >(allBlocks, ids.PubLeafletBlocksBskyPost);
  const bskyPostBatches: typeof bskyPostBlocks[] = [];
  for (let i = 0; i < bskyPostBlocks.length; i += 25) {
    bskyPostBatches.push(bskyPostBlocks.slice(i, i + 25));
  }
  const bskyPostResponses = await Promise.all(
    bskyPostBatches.map((batch) =>
      agent.getPosts(
        { uris: batch.map((p) => p.block.postRef.uri) },
        { headers: {} },
      ),
    ),
  );
  const bskyPostData = bskyPostResponses.flatMap((r) => r.data.posts);

  const standardSitePostUris = Array.from(
    new Set(
      extractBlocksByType<$Typed<PubLeafletBlocksStandardSitePost.Main>>(
        allBlocks,
        ids.PubLeafletBlocksStandardSitePost,
      ).map((b) => b.block.uri),
    ),
  );
  const standardSitePostsResult =
    standardSitePostUris.length > 0
      ? await get_standard_site_posts.handler(
          { uris: standardSitePostUris },
          { supabase: supabaseServerClient },
        )
      : { result: { posts: [] } };
  const standardSitePostData = standardSitePostsResult.result.posts;

  const pollBlocks = extractBlocksByType<$Typed<PubLeafletBlocksPoll.Main>>(
    allBlocks,
    ids.PubLeafletBlocksPoll,
  );
  const pollData = await fetchPollData(
    pollBlocks.map((b) => b.block.pollRef.uri),
  );

  const firstPageBlocks = (pages[0] as Page | undefined)?.blocks ?? [];
  const prerenderedCodeBlocks = await extractCodeBlocks(firstPageBlocks);

  return {
    bskyPostData,
    standardSitePostData,
    pollData,
    prerenderedCodeBlocks,
  };
}
