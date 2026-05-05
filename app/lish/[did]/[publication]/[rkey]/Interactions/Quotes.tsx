"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useIsMobile } from "src/hooks/isMobile";
import { setInteractionState } from "./Interactions";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { AtUri, AppBskyFeedPost } from "@atproto/api";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { useDocument } from "contexts/DocumentContext";
import { useLeafletContent } from "contexts/LeafletContentContext";
import { decodeQuotePosition, QuotePosition } from "../quotePosition";
import { extractQuotedBlocks } from "../quoteExtraction";
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
  const { uri: document_uri } = useDocument();

  // Fetch Bluesky post data for all URIs
  const uris = props.quotesAndMentions.map((q) => q.uri);
  const key = getQuotesSWRKey(uris);
  const { data: bskyPosts, isLoading } = useSWR(key, () =>
    fetchBskyPosts(uris),
  );

  // Separate quotes with links (quoted content) from direct mentions
  const quotesWithLinks = props.quotesAndMentions.filter((q) => q.link);
  const directMentions = props.quotesAndMentions.filter((q) => !q.link);

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
  quotesWithLinks.sort(byEngagement);
  directMentions.sort(byEngagement);

  return (
    <>
      {props.quotesAndMentions.length === 0 ? (
        <div className="opaque-container flex flex-col gap-0.5 p-[6px] text-tertiary italic text-sm text-center">
          <div className="font-bold">no quotes yet!</div>
          <div>highlight any part of this post to quote it</div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm mt-8">
          <span>loading</span>
          <DotLoader />
        </div>
      ) : (
        <div className="flex flex-col gap-8 w-full">
          {quotesWithLinks.length > 0 && (
            <div className="flex flex-col  w-full">
              <h4 className="mb-2">Quotes on Bluesky</h4>
              {/* Quotes with links (quoted content) */}
              {quotesWithLinks.map((q, index) => {
                return (
                  <>
                    <Quote
                      key={q.uri}
                      q={q}
                      index={index}
                      did={props.did}
                      postViewMap={postViewMap}
                    />
                    {quotesWithLinks.length !== index + 1 && (
                      <hr className="border-border-light my-4" />
                    )}
                  </>
                );
              })}
            </div>
          )}
          {/* Direct post mentions (without quoted content) */}
          {directMentions.length > 0 && (
            <div className="flex flex-col">
              <h4 className="mb-2">Mentions on Bluesky</h4>
              {directMentions.map((q, index) => {
                const post = postViewMap.get(q.uri);
                if (!post) return null;

                const parent = { type: "thread" as const, uri: q.uri };
                return (
                  <>
                    <BskyPostContent
                      key={`mention-${index}`}
                      post={post}
                      parent={parent}
                      showBlueskyLink={true}
                      showEmbed={true}
                      avatarSize="medium"
                      quoteEnabled
                      replyEnabled
                      className="text-sm"
                      compactEmbed
                    />
                    {directMentions.length !== index + 1 && (
                      <hr className="border-border-light my-4" />
                    )}
                  </>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
};

const Quote = (props: {
  q: {
    uri: string;
    link?: string;
  };
  index: number;
  did: string;
  postViewMap: Map<string, PostView>;
}) => {
  const post = props.postViewMap.get(props.q.uri);
  if (!post || !props.q.link) return null;
  const parent = { type: "thread" as const, uri: props.q.uri };
  const url = new URL(props.q.link);
  const quoteParam = url.pathname.split("/l-quote/")[1];
  if (!quoteParam) return null;
  const quotePosition = decodeQuotePosition(quoteParam);
  if (!quotePosition) return null;

  return (
    <div key={`quote-${props.index}`} className="flex flex-col w-full">
      <QuoteContent
        index={props.index}
        did={props.did}
        position={quotePosition}
      />

      <div className="h-3 w-1 ml-[11px] border-l border-border-light" />
      <BskyPostContent
        post={post}
        parent={parent}
        showBlueskyLink={true}
        showEmbed={false}
        avatarSize="medium"
        quoteEnabled
        replyEnabled
        className="text-sm"
      />
    </div>
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
        <div className="italic border border-border-light rounded-md px-2 pt-1">
          <PostContent
            pollData={[]}
            pages={[]}
            bskyPostData={[]}
            blocks={content}
            did={props.did}
            preview
            className="py-0! px-0! text-tertiary"
          />
        </div>
      </div>
    </div>
  );
};

