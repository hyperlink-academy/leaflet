"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useIsMobile } from "src/hooks/isMobile";
import { setInteractionState } from "./Interactions";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { AtUri, AppBskyFeedPost, AppBskyEmbedExternal } from "@atproto/api";
import {
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksHeader,
  PubLeafletPagesLinearDocument,
  PubLeafletBlocksCode,
} from "lexicons/api";
import { useDocument } from "contexts/DocumentContext";
import { useLeafletContent } from "contexts/LeafletContentContext";
import {
  decodeQuotePosition,
  getDocumentUrls,
  matchDocumentUrl,
  QuotePosition,
} from "../quotePosition";
import { useActiveHighlightState } from "../useHighlight";
import { PostContent } from "../PostContent";
import { ProfileViewBasic } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { flushSync } from "react-dom";
import { openPage } from "../postPageState";
import useSWR, { mutate } from "swr";
import { DotLoader } from "components/utils/DotLoader";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { ThreadLink, QuotesLink } from "../PostLinks";
import { BskyPostContent } from "../BskyPostContent";
import { EmptyState } from "components/EmptyState";

function engagementScore(post: PostView | undefined): number {
  if (!post) return 0;
  return (
    (post.likeCount ?? 0) +
    (post.replyCount ?? 0) * 1.5 +
    (post.quoteCount ?? 0) * 1.5
  );
}

// Helper to get SWR key for quotes
export function getQuotesSWRKey(uris: string[]) {
  if (uris.length === 0) return null;
  const params = new URLSearchParams({
    uris: JSON.stringify(uris),
  });
  return `/api/bsky/hydrate?${params.toString()}`;
}

// Fetch posts from API route
async function fetchBskyPosts(uris: string[]): Promise<PostView[]> {
  const params = new URLSearchParams({
    uris: JSON.stringify(uris),
  });

  const response = await fetch(`/api/bsky/hydrate?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch Bluesky posts");
  }

  return response.json();
}

// Prefetch quotes data
export function prefetchQuotesData(
  quotesAndMentions: { uri: string; link?: string }[],
) {
  const uris = quotesAndMentions.map((q) => q.uri);
  const key = getQuotesSWRKey(uris);
  if (key) {
    // Start fetching without blocking
    mutate(key, fetchBskyPosts(uris), { revalidate: false });
  }
}

export const MentionsDrawerContent = (props: {
  quotesAndMentions: { uri: string; link?: string }[];
  did: string;
}) => {
  const {
    uri: document_uri,
    normalizedDocument,
    normalizedPublication,
  } = useDocument();

  // URLs that point to this document, used to detect when a post's embed is
  // just a link card back to this leaflet (redundant with the quote we render)
  const documentUrls = getDocumentUrls(
    normalizedDocument,
    document_uri,
    normalizedPublication,
  );

  // Fetch Bluesky post data for all URIs
  const uris = props.quotesAndMentions.map((q) => q.uri);
  const key = getQuotesSWRKey(uris);
  const { data: bskyPosts, isLoading } = useSWR(key, () =>
    fetchBskyPosts(uris),
  );

  // Separate quotes with links (quoted content) from direct mentions
  // const quotesWithLinks = props.quotesAndMentions.filter((q) => q.link);
  // const directMentions = props.quotesAndMentions.filter((q) => !q.link);

  // Create a map of URIs to post views for easy lookup
  const postViewMap = new Map<string, PostView>();
  bskyPosts?.forEach((pv) => {
    postViewMap.set(pv.uri, pv);
  });

  // Sort by engagement: likes count 1, replies and quotes count 1.5
  const byEngagement = (a: { uri: string }, b: { uri: string }) => {
    const scoreA = engagementScore(postViewMap.get(a.uri));
    const scoreB = engagementScore(postViewMap.get(b.uri));
    return scoreB - scoreA;
  };
  let sortedBskyMentions = props.quotesAndMentions.sort(byEngagement);

  return (
    <>
      {props.quotesAndMentions.length === 0 ? (
        <EmptyState container="opaque" title="It's quiet… for now.">
          <div className="font-bold">no quotes yet!</div>
          <div>highlight any part of this post to quote it</div>
        </EmptyState>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm mt-8">
          <span>loading</span>
          <DotLoader />
        </div>
      ) : (
        sortedBskyMentions.length > 0 && (
          <div className="flex flex-col gap-6">
            {sortedBskyMentions.map((q, index) => {
              const post = postViewMap.get(q.uri);
              if (!post) return null;
              const parent = { type: "thread" as const, uri: q.uri };
              let quotePosition: QuotePosition | null = null;
              if (q.link) {
                const url = new URL(q.link);
                const quoteParam = url.pathname.split("/l-quote/")[1];
                if (quoteParam) {
                  quotePosition = decodeQuotePosition(quoteParam) ?? null;
                }
              }

              // Hide the embed when it's just a link card pointing back to this
              // document; show it for any other embed (image, link, quoted post)
              const showEmbed = !(
                AppBskyEmbedExternal.isView(post.embed) &&
                matchDocumentUrl(post.embed.external.uri, documentUrls)
              );

              return (
                <>
                  <BskyPostContent
                    key={`mention-${index}`}
                    post={post}
                    parent={parent}
                    showBlueskyLink={true}
                    showEmbed={showEmbed}
                    avatarSize="medium"
                    quoteEnabled
                    replyEnabled
                    className="text-sm"
                    compactEmbed
                    hasQuote={
                      quotePosition
                        ? {
                            index: index,
                            did: props.did,
                            position: quotePosition,
                          }
                        : undefined
                    }
                  />
                  <hr className="border-border-light last:hidden" />
                </>
              );
            })}
          </div>
        )
      )}
    </>
  );
};

export const QuoteContent = (props: {
  position: QuotePosition;
  index: number;
  did: string;
}) => {
  let isMobile = useIsMobile();
  const { uri: document_uri } = useDocument();
  const { pages } = useLeafletContent();

  let page: PubLeafletPagesLinearDocument.Main | undefined = (
    props.position.pageId
      ? pages.find(
          (p) =>
            (p as PubLeafletPagesLinearDocument.Main).id ===
            props.position.pageId,
        )
      : pages[0]
  ) as PubLeafletPagesLinearDocument.Main;
  // Extract blocks within the quote range
  const content = extractQuotedBlocks(page.blocks || [], props.position, []);
  return (
    <div
      className="quoteSection"
      onMouseLeave={() => {
        useActiveHighlightState.setState({ activeHighlight: null });
      }}
      onMouseEnter={() => {
        useActiveHighlightState.setState({ activeHighlight: props.position });
      }}
    >
      <div
        className="quoteSectionQuote text-secondary text-sm text-left hover:cursor-pointer"
        onClick={(e) => {
          if (props.position.pageId)
            flushSync(() =>
              openPage(undefined, { type: "doc", id: props.position.pageId! }),
            );
          let scrollMargin = isMobile
            ? 16
            : e.currentTarget.getBoundingClientRect().top;
          let scrollContainerId = `post-page-${props.position.pageId ?? document_uri}`;
          let scrollContainer =
            window.document.getElementById(scrollContainerId);
          let el = window.document.getElementById(
            props.position.start.block.join("."),
          );
          if (!el || !scrollContainer) return;
          let blockRect = el.getBoundingClientRect();
          let quoteScrollTop =
            (scrollContainer && blockRect.top + scrollContainer.scrollTop) || 0;

          if (blockRect.left < 0)
            scrollContainer.scrollIntoView({ behavior: "smooth" });
          scrollContainer?.scrollTo({
            top: quoteScrollTop - scrollMargin,
            behavior: "smooth",
          });
        }}
      >
        <div className="flex gap-3 items-stretch italic rounded-md pt-1 ">
          <div className="relative flex">
            <QuoteTiny className="shrink-0 text-tertiary bg-bg-page absolute -left-2 top-3" />
            <div className="w-0.5 grow border border-border mx-auto my-2" />
          </div>
          <PostContent
            pollData={[]}
            pages={[]}
            bskyPostData={[]}
            standardSitePostData={[]}
            blocks={content}
            did={props.did}
            preview
            className="pt-3! px-0! text-tertiary"
          />
        </div>
      </div>
    </div>
  );
};

function extractQuotedBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[],
  quotePosition: QuotePosition,
  currentPath: number[],
): PubLeafletPagesLinearDocument.Block[] {
  const result: PubLeafletPagesLinearDocument.Block[] = [];

  blocks.forEach((block, index) => {
    const blockPath = [...currentPath, index];

    // Handle different block types
    if (PubLeafletBlocksUnorderedList.isMain(block.block)) {
      // For lists, recursively extract quoted items
      const quotedChildren = extractQuotedListItems(
        block.block.children,
        quotePosition,
        blockPath,
      );

      if (quotedChildren.length > 0) {
        result.push({
          ...block,
          block: {
            ...block.block,
            children: quotedChildren,
          },
        });
      }
      return;
    }

    if (!isBlockInRange(blockPath, quotePosition)) {
      return;
    }
    if (
      PubLeafletBlocksText.isMain(block.block) ||
      PubLeafletBlocksHeader.isMain(block.block) ||
      PubLeafletBlocksCode.isMain(block.block)
    ) {
      // For text blocks, trim to quoted portion
      const trimmedBlock = trimTextBlock(block, blockPath, quotePosition);
      if (trimmedBlock) {
        result.push(trimmedBlock);
      }
    } else {
      // For other blocks (images, websites), include the whole block if in range
      result.push(block);
    }
  });

  return result;
}

function extractQuotedListItems(
  items: PubLeafletBlocksUnorderedList.ListItem[],
  quotePosition: QuotePosition,
  parentPath: number[],
): PubLeafletBlocksUnorderedList.ListItem[] {
  const result: PubLeafletBlocksUnorderedList.ListItem[] = [];
  if (!Array.isArray(items)) return [];

  items.forEach((item, index) => {
    const itemPath = [...parentPath, index];

    // Check if the content is in range
    const contentBlock = { block: item.content };
    const trimmedContent = isBlockInRange(itemPath, quotePosition)
      ? trimTextBlock(contentBlock, itemPath, quotePosition)
      : null;

    // Recursively handle children
    let quotedChildren: PubLeafletBlocksUnorderedList.ListItem[] = [];
    if (item.children) {
      quotedChildren = extractQuotedListItems(
        item.children,
        quotePosition,
        itemPath,
      );
    }

    if (!trimmedContent && !quotedChildren.length) {
      return;
    }

    result.push({
      content: trimmedContent?.block || { $type: "null" },
      children: quotedChildren.length > 0 ? quotedChildren : undefined,
    });
  });

  return result;
}

function isBlockInRange(
  blockPath: number[],
  quotePosition: QuotePosition,
): boolean {
  const { start, end } = quotePosition;

  // Compare paths lexicographically
  const isAfterStart = compareBlockPaths(blockPath, start.block) >= 0;
  const isBeforeEnd = compareBlockPaths(blockPath, end.block) <= 0;

  return isAfterStart && isBeforeEnd;
}

function compareBlockPaths(path1: number[], path2: number[]): number {
  const minLength = Math.min(path1.length, path2.length);

  for (let i = 0; i < minLength; i++) {
    if (path1[i] < path2[i]) return -1;
    if (path1[i] > path2[i]) return 1;
  }

  return path1.length - path2.length;
}

function trimTextBlock(
  block: PubLeafletPagesLinearDocument.Block,
  blockPath: number[],
  quotePosition: QuotePosition,
): PubLeafletPagesLinearDocument.Block | null {
  if (
    !PubLeafletBlocksText.isMain(block.block) &&
    !PubLeafletBlocksHeader.isMain(block.block) &&
    !PubLeafletBlocksCode.isMain(block.block)
  ) {
    return block;
  }

  const { start, end } = quotePosition;
  let startOffset = 0;
  let endOffset = block.block.plaintext.length;

  // If this is the start block, use the start offset
  if (arraysEqual(blockPath, start.block)) {
    startOffset = start.offset;
  }

  // If this is the end block, use the end offset
  if (arraysEqual(blockPath, end.block)) {
    endOffset = end.offset;
  }

  // Extract the quoted portion
  const quotedText = block.block.plaintext.substring(startOffset, endOffset);
  if (!quotedText) return null;

  // Adjust facets to the new text range
  let adjustedFacets;
  if (
    PubLeafletBlocksText.isMain(block.block) ||
    PubLeafletBlocksHeader.isMain(block.block)
  ) {
    adjustedFacets = !Array.isArray(block.block?.facets)
      ? []
      : (block.block?.facets
          ?.map((facet) => {
            const facetStart = facet.index.byteStart;
            const facetEnd = facet.index.byteEnd;

            // Skip facets outside the quoted range
            if (facetEnd <= startOffset || facetStart >= endOffset) {
              return null;
            }

            // Adjust facet indices
            return {
              ...facet,
              index: {
                byteStart: Math.max(0, facetStart - startOffset),
                byteEnd: Math.min(quotedText.length, facetEnd - startOffset),
              },
            };
          })
          .filter((f) => f !== null) as typeof block.block.facets);
  }

  return {
    ...block,
    block: {
      ...block.block,
      plaintext: quotedText,
      //@ts-ignore
      facets: adjustedFacets,
    },
  };
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}
