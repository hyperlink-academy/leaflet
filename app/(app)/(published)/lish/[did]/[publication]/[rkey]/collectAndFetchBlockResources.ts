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
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";
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
import { loadDocumentReplies, type DocumentReply } from "src/documentReplies";
import { audienceTierIds } from "src/questionsAudience";
import {
  loadDocumentQuestions,
  type DocumentQuestion,
} from "src/documentQuestions";

type Page = PubLeafletPagesLinearDocument.Main | PubLeafletPagesCanvas.Main;

export async function collectAndFetchBlockResources({
  agent,
  pages,
  documentUri,
  publicationUri,
  openPageId,
  skipCodeBlocks,
}: {
  agent: AtpAgent;
  pages: Page[];
  documentUri?: string;
  // The document's publication, whose tiers a block's tierIds name
  publicationUri?: string;
  openPageId?: string;
  skipCodeBlocks?: boolean;
}): Promise<{
  bskyPostData: AppBskyFeedDefs.PostView[];
  standardSitePostData: StandardSitePostData[];
  standardSitePublicationData: StandardSitePublicationData[];
  pollData: PollData[];
  // The replies anyone can see, for a document carrying a reply block.
  replyData: DocumentReply[];
  // The answered questions, for a document carrying a questions block.
  questionData: DocumentQuestion[];
  // Membership tier names by id, for questions or reply blocks limited to
  // selected tiers.
  tierNames: Record<string, string>;
  prerenderedCodeBlocks: Map<string, string>;
}> {
  const pageBlocks: PubLeafletPagesLinearDocument.Block[] = pages.flatMap((p) =>
    pageBlocksInOrder(p).map((b) => b.block),
  );
  const audienceTiers = [
    ...new Set(
      pageBlocks.flatMap((b) => {
        const block = b.block as {
          $type: string;
          audience?: unknown;
          tierIds?: unknown;
        };
        if (
          block.$type !== ids.PubLeafletBlocksQuestions &&
          block.$type !== ids.PubLeafletBlocksReply
        )
          return [];
        return block.audience === "tiers" ? audienceTierIds(block) : [];
      }),
    ),
  ];
  const tierNamesPromise = fetchTierNames(publicationUri, audienceTiers);
  const hasQuestionsBlock = pageBlocks.some(
    (b) => b.block.$type === ids.PubLeafletBlocksQuestions,
  );
  const questionData =
    documentUri && hasQuestionsBlock
      ? (await loadDocumentQuestions(documentUri, null)).questions
      : [];
  // Published answers render through the same block renderer, so their
  // embeds are fetched alongside the post's.
  const allBlocks = [
    ...pageBlocks,
    ...questionData.flatMap((q) => q.answer?.content.blocks ?? []),
  ];

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

  const hasReplyBlock = allBlocks.some(
    (b) => b.block.$type === ids.PubLeafletBlocksReply,
  );
  const replyData =
    documentUri && hasReplyBlock
      ? (await loadDocumentReplies(documentUri, null)).replies
      : [];

  const prerenderedCodeBlocks = new Map<string, string>();
  await Promise.all(
    pages.map(async (page, pageIndex) => {
      if (skipCodeBlocks) return;
      const isServerRendered =
        pageIndex === 0 || (!!openPageId && page.id === openPageId);
      if (!isServerRendered) return;
      const pageCode = await extractCodeBlocks(page);
      const pageKey = pageIndex === 0 ? "" : page.id ?? "";
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
    replyData,
    questionData,
    tierNames: await tierNamesPromise,
    prerenderedCodeBlocks,
  };
}

async function fetchTierNames(
  publicationUri: string | undefined,
  tierIds: string[],
): Promise<Record<string, string>> {
  if (!publicationUri || tierIds.length === 0) return {};
  const { data, error } = await supabaseServerClient
    .from("publication_membership_tiers")
    .select("id, name")
    .eq("publication", publicationUri)
    .in("id", tierIds);
  if (error) {
    console.error("[post] tier names lookup failed", error);
    return {};
  }
  return Object.fromEntries(data.map((t) => [t.id, t.name]));
}
