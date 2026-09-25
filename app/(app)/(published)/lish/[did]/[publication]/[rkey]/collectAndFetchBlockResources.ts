import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksPoll,
  PubLeafletBlocksStandardSitePost,
  PubLeafletBlocksStandardSitePublication,
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
import {
  get_standard_site_publications,
  type StandardSitePublicationData,
} from "app/api/rpc/[command]/get_standard_site_publications";
import { extractBlocksByType } from "src/utils/extractBlocksByType";
import { extractCodeBlocks } from "./extractCodeBlocks";
import { fetchPollData, type PollData } from "./fetchPollData";
import { fetchBskyPosts } from "src/utils/fetchBskyPosts";

type Page =
  | PubLeafletPagesLinearDocument.Main
  | PubLeafletPagesCanvas.Main;

export async function collectAndFetchBlockResources({
  agent,
  pages,
  openPageId,
  skipCodeBlocks,
}: {
  agent: AtpAgent;
  pages: Page[];
  openPageId?: string;
  // For callers whose output never reaches the SSR HTML (the members-only
  // unlock action): PubCodeBlock re-highlights on mount anyway, so running
  // shiki server-side would be pure waste.
  skipCodeBlocks?: boolean;
}): Promise<{
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  standardSitePublicationData: StandardSitePublicationData[];
  pollData: PollData[];
  prerenderedCodeBlocks: Map<string, string>;
}> {
  const allBlocks: PubLeafletPagesLinearDocument.Block[] = pages.flatMap(
    (p) => (p as PubLeafletPagesLinearDocument.Main).blocks ?? [],
  );

  const bskyPostBlocks = extractBlocksByType<
    $Typed<PubLeafletBlocksBskyPost.Main>
  >(allBlocks, ids.PubLeafletBlocksBskyPost);
  const bskyPostData = await fetchBskyPosts(
    agent,
    bskyPostBlocks.map((p) => p.block.postRef.uri),
  );

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

  const standardSitePublicationUris = Array.from(
    new Set(
      extractBlocksByType<$Typed<PubLeafletBlocksStandardSitePublication.Main>>(
        allBlocks,
        ids.PubLeafletBlocksStandardSitePublication,
      ).map((b) => b.block.uri),
    ),
  );
  const standardSitePublicationsResult =
    standardSitePublicationUris.length > 0
      ? await get_standard_site_publications.handler(
          { uris: standardSitePublicationUris },
          { supabase: supabaseServerClient },
        )
      : { result: { publications: [] } };
  const standardSitePublicationData =
    standardSitePublicationsResult.result.publications;

  const pollBlocks = extractBlocksByType<$Typed<PubLeafletBlocksPoll.Main>>(
    allBlocks,
    ids.PubLeafletBlocksPoll,
  );
  const pollData = await fetchPollData(
    pollBlocks.map((b) => b.block.pollRef.uri),
  );

  // Keyed `${pageId}:${blockIndex}` to match PostContent's lookup: the root
  // page renders with no pageId, subpages with their page id.
  const prerenderedCodeBlocks = new Map<string, string>();
  await Promise.all(
    pages.map(async (page, pageIndex) => {
      if (skipCodeBlocks) return;
      const isServerRendered =
        pageIndex === 0 || (!!openPageId && page.id === openPageId);
      if (!isServerRendered) return;
      const pageCode = await extractCodeBlocks(page.blocks ?? []);
      const pageKey = pageIndex === 0 ? "" : (page.id ?? "");
      for (const [blockIndex, html] of pageCode) {
        prerenderedCodeBlocks.set(`${pageKey}:${blockIndex}`, html);
      }
    }),
  );

  return {
    bskyPostData,
    standardSitePostData,
    standardSitePublicationData,
    pollData,
    prerenderedCodeBlocks,
  };
}
