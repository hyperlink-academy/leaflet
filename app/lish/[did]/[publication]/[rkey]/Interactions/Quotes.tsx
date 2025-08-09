"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useContext } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { useInteractionState } from "./Interactions";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";
import { PostPageContext } from "../PostPageContext";
import {
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksHeader,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletBlocksCode,
} from "lexicons/api";
import {
  decodeQuotePosition,
  QuotePosition,
  useActiveHighlightState,
} from "../useHighlight";
import { PostContent } from "../PostContent";
import { ProfileViewBasic } from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export const Quotes = (props: {
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
  did: string;
}) => {
  let isMobile = useIsMobile();
  let data = useContext(PostPageContext);

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full flex justify-between text-secondary font-bold">
        Quotes
        <button
          className="text-tertiary"
          onClick={() => useInteractionState.setState({ drawerOpen: false })}
        >
          <CloseTiny />
        </button>
      </div>
      {props.quotes.length === 0 ? (
        <div className="opaque-container flex flex-col gap-0.5 p-[6px] text-tertiary italic text-sm text-center">
          <div className="font-bold">no quotes yet!</div>
          <div>highlight any part of this post to quote it</div>
        </div>
      ) : (
        <div className="quotes flex flex-col gap-12">
          {props.quotes.map((q, index) => {
            let pv = q.bsky_posts?.post_view as unknown as PostView;
            let record = data?.data as PubLeafletDocument.Record;
            const url = new URL(q.link);
            const quoteParam = url.pathname.split("/l-quote/")[1];
            if (!quoteParam) return null;
            const quotePosition = decodeQuotePosition(quoteParam);
            if (!quotePosition) return null;

            let page = record.pages[0] as PubLeafletPagesLinearDocument.Main;
            // Extract blocks within the quote range
            const content = extractQuotedBlocks(
              page.blocks || [],
              quotePosition,
              [],
            );
            return (
              <div
                className="quoteSection flex flex-col gap-2"
                key={index}
                onMouseLeave={() => {
                  useActiveHighlightState.setState({ activeHighlight: null });
                }}
                onMouseEnter={() => {
                  useActiveHighlightState.setState({ activeHighlight: index });
                }}
              >
                <div
                  className="quoteSectionQuote text-secondary text-sm text-left pb-1 hover:cursor-pointer"
                  onClick={(e) => {
                    let scrollMargin = isMobile
                      ? 16
                      : e.currentTarget.getBoundingClientRect().top;
                    let scrollContainer =
                      window.document.getElementById("post-page");
                    let el = window.document.getElementById(
                      quotePosition.start.block.join("."),
                    );
                    if (!el || !scrollContainer) return;
                    let blockRect = el.getBoundingClientRect();
                    let quoteScrollTop =
                      (scrollContainer &&
                        blockRect.top + scrollContainer.scrollTop) ||
                      0;

                    if (blockRect.left < 0)
                      scrollContainer.scrollIntoView({ behavior: "smooth" });
                    scrollContainer?.scrollTo({
                      top: quoteScrollTop - scrollMargin,
                      behavior: "smooth",
                    });
                  }}
                >
                  <div className="italic">
                    <PostContent
                      blocks={content || []}
                      did={props.did}
                      preview
                    />
                  </div>
                  <BskyPost
                    rkey={new AtUri(pv.uri).rkey}
                    content={pv.record.text as string}
                    user={pv.author.displayName || pv.author.handle}
                    profile={pv.author}
                    handle={pv.author.handle}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BskyPost = (props: {
  rkey: string;
  content: string;
  user: string;
  handle: string;
  profile: ProfileViewBasic;
}) => {
  return (
    <a
      target="_blank"
      href={`https://bsky.app/profile/${props.handle}/post/${props.rkey}`}
      className="quoteSectionBskyItem opaque-container py-2 px-2 text-sm flex gap-[6px] hover:no-underline font-normal"
    >
      {props.profile.avatar && (
        <img
          className="rounded-full w-6 h-6"
          src={props.profile.avatar}
          alt={props.profile.displayName}
        />
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="font-bold">{props.user}</div>
          <div className="text-tertiary">@{props.handle}</div>
        </div>
        <div className="text-secondary">{props.content}</div>
      </div>
    </a>
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
    console.log(blockPath);

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
    adjustedFacets = block.block?.facets
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
      .filter((f) => f !== null) as typeof block.block.facets;
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
