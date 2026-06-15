"use client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
  AppBskyEmbedExternal,
} from "@atproto/api";
import { AtUri } from "@atproto/syntax";
import useSWR from "swr";
import { DrawerThreadContext } from "./Interactions/drawerThreadContext";
import { DotLoader } from "components/utils/DotLoader";
import { PostNotAvailable } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { useThreadState } from "src/useThreadState";
import { BskyPostContent, CompactBskyPostContent } from "./BskyPostContent";
import {
  ThreadLink,
  getThreadKey,
  fetchThread,
  getQuotesKey,
  fetchQuotes,
} from "./PostLinks";
import { Tabs } from "components/Tabs";
import { CollapsibleReplies } from "components/CollapsibleReplies";
import { useDocument } from "contexts/DocumentContext";
import { QuoteContent } from "./Interactions/Quotes";
import {
  decodeQuotePosition,
  getDocumentUrls,
  matchDocumentUrl,
  type QuotePosition,
} from "./quotePosition";

type ThreadViewPost = AppBskyFeedDefs.ThreadViewPost;
type NotFoundPost = AppBskyFeedDefs.NotFoundPost;
type BlockedPost = AppBskyFeedDefs.BlockedPost;
type ThreadType = ThreadViewPost | NotFoundPost | BlockedPost;

// Walk a reply chain collecting consecutive same-author posts
// where each post is the sole reply. Returns the flat chain.
function flattenSameAuthorChain(
  post: ThreadViewPost,
  rootAuthorDid: string,
): ThreadViewPost[] {
  if (post.post.author.did !== rootAuthorDid) return [post];

  const chain: ThreadViewPost[] = [post];
  let current = post;

  while (current.replies && current.replies.length > 0) {
    const replies = current.replies as any[];
    const sameAuthorReplies = replies.filter(
      (r) =>
        AppBskyFeedDefs.isThreadViewPost(r) &&
        (r as ThreadViewPost).post.author.did === rootAuthorDid,
    ) as ThreadViewPost[];

    // Only flatten if there's exactly one reply and it's by the same author
    if (sameAuthorReplies.length !== 1 || replies.length !== 1) break;

    chain.push(sameAuthorReplies[0]);
    current = sameAuthorReplies[0];
  }

  return chain;
}

// Scan a post's facets and embed for links to the current document
function findDocumentQuoteLink(
  post: AppBskyFeedDefs.PostView,
  documentUrls: string[],
): {
  url: string;
  quotePosition: QuotePosition | null;
  isEmbed: boolean;
} | null {
  if (documentUrls.length === 0) return null;

  const record = post.record as AppBskyFeedPost.Record;

  // Check facets for link URIs
  if (record.facets) {
    for (const facet of record.facets) {
      for (const feature of facet.features) {
        if (AppBskyRichtextFacet.isLink(feature)) {
          const match = matchDocumentUrl(feature.uri, documentUrls);
          if (match) return { ...match, isEmbed: false };
        }
      }
    }
  }

  // Check external embed URI
  if (post.embed && AppBskyEmbedExternal.isView(post.embed)) {
    const match = matchDocumentUrl(post.embed.external.uri, documentUrls);
    if (match) return { ...match, isEmbed: true };
  }

  return null;
}

// Fetches a thread and renders its content (loading/error states included).
// Used both as a standalone page and inside the interaction drawer. `initialTab`
// selects whether replies or quote posts are shown first (defaults to replies).
export function ThreadView(props: {
  parentUri: string;
  initialTab?: "replies" | "quotes";
}) {
  const { parentUri, initialTab } = props;
  const {
    data: thread,
    isLoading,
    error,
  } = useSWR(parentUri ? getThreadKey(parentUri) : null, () =>
    fetchThread(parentUri),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
        <span>loading thread</span>
        <DotLoader />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-tertiary italic text-sm text-center py-8">
        Failed to load thread
      </div>
    );
  }
  if (!thread) return null;
  return (
    <ThreadContent post={thread} parentUri={parentUri} initialTab={initialTab} />
  );
}

function ThreadContent(props: {
  post: ThreadType;
  parentUri: string;
  initialTab?: "replies" | "quotes";
}) {
  const { post, parentUri } = props;
  const mainPostRef = useRef<HTMLDivElement>(null);
  // Inside the interaction drawer the header (back/close) shares the scroll
  // container, so we let the drawer handle scroll position instead of pulling
  // the main post to the top (which would hide the header).
  const inDrawer = useContext(DrawerThreadContext) !== null;

  // Compute document URLs for leaflet link detection
  const {
    uri: docUri,
    normalizedDocument,
    normalizedPublication,
  } = useDocument();
  const docAtUri = useMemo(() => new AtUri(docUri), [docUri]);
  const docDid = docAtUri.host;

  const documentUrls = useMemo(
    () => getDocumentUrls(normalizedDocument, docUri, normalizedPublication),
    [docUri, normalizedDocument, normalizedPublication],
  );

  // Scroll the main post into view when the thread loads
  useEffect(() => {
    if (inDrawer) return;
    if (mainPostRef.current) {
      mainPostRef.current.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }
  }, [inDrawer]);

  if (AppBskyFeedDefs.isNotFoundPost(post)) {
    return <PostNotAvailable />;
  }

  if (AppBskyFeedDefs.isBlockedPost(post)) {
    return (
      <div className="text-tertiary italic text-sm text-center py-8">
        This post is blocked
      </div>
    );
  }

  if (!AppBskyFeedDefs.isThreadViewPost(post)) {
    return <PostNotAvailable />;
  }

  const rootAuthorDid = post.post.author.did;

  // Collect all parent posts in order (oldest first)
  const parents: ThreadViewPost[] = [];
  let currentParent = post.parent;
  while (currentParent && AppBskyFeedDefs.isThreadViewPost(currentParent)) {
    parents.unshift(currentParent);
    currentParent = currentParent.parent;
  }

  return (
    <div
      className={`threadContent flex flex-col gap-0 w-full ${parents.length !== 0 && "pt-1"}`}
    >
      {/* grandparent posts, if any */}
      {parents.map((parentPost, index) => (
        <ThreadPost
          key={parentPost.post.uri}
          post={parentPost}
          isMainPost={false}
          pageUri={parentUri}
        />
      ))}

      {/* Main post */}
      <div ref={mainPostRef}>
        <ThreadPost post={post} isMainPost={true} pageUri={parentUri} />
      </div>

      {/* Replies and quote posts */}
      <ThreadInteractions
        post={post}
        rootAuthorDid={rootAuthorDid}
        documentUrls={documentUrls}
        docDid={docDid}
        initialTab={props.initialTab}
      />
    </div>
  );
}

// Tabbed section under the main post showing its replies and quote posts.
// When only one of the two has content, a header is shown instead of tabs.
function ThreadInteractions(props: {
  post: ThreadViewPost;
  rootAuthorDid: string;
  documentUrls: string[];
  docDid: string;
  initialTab?: "replies" | "quotes";
}) {
  const { post, rootAuthorDid, documentUrls, docDid } = props;

  const replies = (post.replies as any[]) ?? [];
  const replyCount = post.post.replyCount ?? replies.length;
  const quoteCount = post.post.quoteCount ?? 0;
  const hasReplies = replies.length > 0;
  const hasQuotes = quoteCount > 0;
  const showTabs = hasReplies && hasQuotes;

  const [activeTab, setActiveTab] = useState<"replies" | "quotes">(
    props.initialTab ?? (hasReplies ? "replies" : "quotes"),
  );

  if (!hasReplies && !hasQuotes) return null;

  // Default to whichever tab actually has content
  const tab = !hasReplies ? "quotes" : !hasQuotes ? "replies" : activeTab;

  return (
    <div className="threadInteractions flex flex-col mt-4  w-full">
      {showTabs ? (
        <Tabs
          value={tab}
          onChange={(value) => setActiveTab(value)}
          options={[
            { value: "replies", label: `Replies (${replyCount})` },
            { value: "quotes", label: `Quote Posts (${quoteCount})` },
          ]}
        />
      ) : (
        <div className="text-tertiary text-sm font-bold">
          {hasReplies
            ? `Replies (${replyCount})`
            : `Quote Posts (${quoteCount})`}
          <hr className="border-border-light mt-[6px]" />
        </div>
      )}

      {tab === "replies" ? (
        <Replies
          replies={replies}
          pageUri={post.post.uri}
          parentPostUri={post.post.uri}
          depth={0}
          parentAuthorDid={post.post.author.did}
          rootAuthorDid={rootAuthorDid}
          documentUrls={documentUrls}
          docDid={docDid}
        />
      ) : (
        <ThreadQuotes postUri={post.post.uri} pageUri={post.post.uri} />
      )}
    </div>
  );
}

// Fetches and renders the posts that quote the main post
function ThreadQuotes(props: { postUri: string; pageUri: string }) {
  const {
    data: quotesData,
    isLoading,
    error,
  } = useSWR(getQuotesKey(props.postUri), () => fetchQuotes(props.postUri));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
        <span>loading quotes</span>
        <DotLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-tertiary italic text-sm text-center py-8">
        Failed to load quotes
      </div>
    );
  }

  if (!quotesData || quotesData.posts.length === 0) {
    return (
      <div className="text-tertiary italic text-sm text-center py-8">
        No quotes yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 pt-4">
      {quotesData.posts.map((post, index) => {
        const parent = { type: "thread" as const, uri: props.pageUri };
        // let isPinnedPost = post.uri ===
        return (
          <>
            <BskyPostContent
              key={post.uri}
              post={post}
              parent={parent}
              showEmbed
              compactEmbed
              showBlueskyLink
              quoteEnabled
              replyEnabled
              className="relative rounded text-sm"
            />

            <hr className="last:hidden border-border-light my-4" />
          </>
        );
      })}
    </div>
  );
}

function ThreadPost(props: {
  post: ThreadViewPost;
  isMainPost: boolean;
  pageUri: string;
}) {
  const { post, isMainPost, pageUri } = props;
  const postView = post.post;
  const page = { type: "thread" as const, uri: pageUri };

  if (isMainPost) {
    return (
      <div className="threadMainPost flex gap-2 relative w-full">
        <BskyPostContent
          post={postView}
          parent={page}
          avatarSize="large"
          showBlueskyLink={true}
          showInteractions={false}
          showEmbed={true}
          compactEmbed
          quoteEnabled
        />
      </div>
    );
  }

  return (
    <div className="threadGrandparentPost flex gap-2 relative w-full pl-[6px] pb-2">
      <div className="absolute top-0 bottom-0 left-[6px] w-5 ">
        <div className="bg-border-light w-[2px] h-full mx-auto" />
      </div>
      <CompactBskyPostContent
        post={postView}
        parent={page}
        quoteEnabled
        replyEnabled
      />
    </div>
  );
}

function Replies(props: {
  replies: (ThreadViewPost | NotFoundPost | BlockedPost)[];
  depth: number;
  parentAuthorDid?: string;
  rootAuthorDid: string;
  pageUri: string;
  parentPostUri: string;
  documentUrls: string[];
  docDid: string;
}) {
  const {
    replies,
    depth,
    parentAuthorDid,
    rootAuthorDid,
    pageUri,
    parentPostUri,
    documentUrls,
    docDid,
  } = props;
  // Sort replies so that replies from the parent author come first
  const sortedReplies = useMemo(
    () =>
      parentAuthorDid
        ? [...replies].sort((a, b) => {
            const aIsAuthor =
              AppBskyFeedDefs.isThreadViewPost(a) &&
              a.post.author.did === parentAuthorDid;
            const bIsAuthor =
              AppBskyFeedDefs.isThreadViewPost(b) &&
              b.post.author.did === parentAuthorDid;
            if (aIsAuthor && !bIsAuthor) return -1;
            if (!aIsAuthor && bIsAuthor) return 1;
            return 0;
          })
        : replies,
    [replies, parentAuthorDid],
  );

  return (
    <div
      className={`replies flex flex-col w-full pt-4 ${
        props.depth === 0 ? "gap-0" : "gap-8"
      }`}
    >
      {sortedReplies.map((reply, index) => {
        if (AppBskyFeedDefs.isNotFoundPost(reply)) {
          return (
            <div
              key={`not-found-${index}`}
              className="text-tertiary italic text-sm px-t py-6 opaque-container text-center justify-center my-2"
            >
              Post not found
            </div>
          );
        }

        if (AppBskyFeedDefs.isBlockedPost(reply)) {
          return (
            <div
              key={`blocked-${index}`}
              className="text-tertiary italic text-sm px-t py-6 opaque-container text-center justify-center my-2"
            >
              Post blocked
            </div>
          );
        }

        if (!AppBskyFeedDefs.isThreadViewPost(reply)) {
          return null;
        }

        const hasReplies = reply.replies && reply.replies.length > 0;

        return (
          <>
            <ReplyPost
              key={reply.post.uri}
              post={reply}
              isLast={index === replies.length - 1 && !hasReplies}
              pageUri={pageUri}
              depth={props.depth}
              rootAuthorDid={rootAuthorDid}
              documentUrls={documentUrls}
              docDid={docDid}
            />
            {props.depth === 0 && (
              <hr className="border-border-light my-4 last:hidden" />
            )}
          </>
        );
      })}
    </div>
  );
}

// Wraps a nested reply list in the same indented thread-line + collapse
// affordance used by document comment replies (Interactions/Comments), and
// animates its height when it opens/closes so threads collapse with the same
// motion as comments.
function NestedReplies(props: {
  open: boolean;
  onCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleReplies open={props.open}>
      <div className="repliesWrapper relative pt-1 pl-[26px] ">
        {/* the thread line itself is non-interactive; a transparent button is
            overlaid on top of it (z-10) so clicking the line collapses the
            thread. The button has to sit over the line (left-[28px]) rather
            than in the empty gutter, otherwise clicks land on the post's
            absolute-inset overlay underneath and open the thread instead. */}
        <div className="absolute top-0 bottom-0 left-[38px] w-[2px] bg-border-light pointer-events-none" />
        <button
          className="repliesCollapse absolute top-0 bottom-0 left-[28px] w-[20px] z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onCollapse();
          }}
        />
        {props.children}
      </div>
    </CollapsibleReplies>
  );
}

const ReplyPost = (props: {
  post: ThreadViewPost;
  isLast: boolean;
  pageUri: string;
  depth: number;
  rootAuthorDid: string;
  documentUrls: string[];
  docDid: string;
}) => {
  const { post, pageUri, rootAuthorDid, documentUrls, docDid } = props;
  const collapsedThreads = useThreadState((s) => s.collapsedThreads);
  const toggleCollapsed = useThreadState((s) => s.toggleCollapsed);

  // Flatten same-author chains
  const chain = flattenSameAuthorChain(post, rootAuthorDid);
  const lastInChain = chain[chain.length - 1];
  const hasReplies = lastInChain.replies && lastInChain.replies.length > 0;
  const isCollapsed = collapsedThreads.has(lastInChain.post.uri);
  const isTruncated =
    !hasReplies &&
    lastInChain.post.replyCount != null &&
    lastInChain.post.replyCount > 0;

  return (
    <div className="flex h-fit relative">
      <div className={`reply relative flex flex-col w-full `}>
        <ReplyPostContent
          post={post.post}
          pageUri={pageUri}
          documentUrls={documentUrls}
          docDid={docDid}
          toggleCollapsed={() => toggleCollapsed(post.post.uri)}
        />

        {/* Render child replies, styled like replies to a comment */}
        {hasReplies && props.depth < 10 && (
          <NestedReplies
            open={!isCollapsed}
            onCollapse={() => toggleCollapsed(lastInChain.post.uri)}
          >
            <Replies
              pageUri={pageUri}
              parentPostUri={lastInChain.post.uri}
              replies={lastInChain.replies as any[]}
              depth={props.depth + 1}
              parentAuthorDid={lastInChain.post.author.did}
              rootAuthorDid={rootAuthorDid}
              documentUrls={documentUrls}
              docDid={docDid}
            />
          </NestedReplies>
        )}

        {/* Auto-load truncated replies */}
        {isTruncated && props.depth < 10 && (
          <NestedReplies
            open={!isCollapsed}
            onCollapse={() => toggleCollapsed(lastInChain.post.uri)}
          >
            {!isCollapsed && (
              <SubThread
                postUri={lastInChain.post.uri}
                pageUri={pageUri}
                depth={props.depth}
                rootAuthorDid={rootAuthorDid}
                documentUrls={documentUrls}
                docDid={docDid}
              />
            )}
          </NestedReplies>
        )}

        {/* Safety fallback at extreme depth */}
        {(hasReplies || isTruncated) && props.depth >= 10 && (
          <div className="ml-[28px]">
            <ThreadLink
              postUri={lastInChain.post.uri}
              parent={{ type: "thread", uri: pageUri }}
              className="text-sm text-accent-contrast hover:underline"
            >
              Continue thread
            </ThreadLink>
          </div>
        )}
      </div>
    </div>
  );
};

// Renders a single post's content with optional inline quote detection
function ReplyPostContent(props: {
  post: AppBskyFeedDefs.PostView;
  pageUri: string;
  documentUrls: string[];
  docDid: string;
  compact?: boolean;
  toggleCollapsed?: () => void;
}) {
  const { post, pageUri, documentUrls, docDid: did, compact } = props;

  // Detect leaflet links in this post
  const docLink = findDocumentQuoteLink(post, documentUrls);
  const page = { type: "thread" as const, uri: pageUri };

  const quoteBlock = docLink?.quotePosition && (
    <div className="mb-1 ml-[32px]">
      <QuoteContent position={docLink.quotePosition} index={0} did={did} />
    </div>
  );

  if (compact) {
    return (
      <div className="bskyPostReplyCompact flex flex-col w-full">
        {quoteBlock}
        <CompactBskyPostContent
          post={post}
          parent={page}
          quoteEnabled
          replyEnabled={!!props.toggleCollapsed}
          replyOnClick={
            props.toggleCollapsed
              ? (e) => {
                  e.preventDefault();
                  props.toggleCollapsed!();
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="bskyPostReply flex flex-col w-full ">
      {quoteBlock}
      <BskyPostContent
        post={post}
        parent={page}
        showEmbed={!docLink?.isEmbed}
        showBlueskyLink={false}
        quoteEnabled
        replyEnabled
        replyOnClick={
          props.toggleCollapsed
            ? (e) => {
                e.preventDefault();
                props.toggleCollapsed!();
              }
            : undefined
        }
        className=" text-sm"
      />
    </div>
  );
}

// Auto-loads a sub-thread when replies were truncated by the API depth limit
function SubThread(props: {
  postUri: string;
  pageUri: string;
  depth: number;
  rootAuthorDid: string;
  documentUrls: string[];
  docDid: string;
}) {
  const { data: thread, isLoading } = useSWR(getThreadKey(props.postUri), () =>
    fetchThread(props.postUri),
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-tertiary italic text-xs py-2">
        <DotLoader />
      </div>
    );
  }

  if (!thread || !AppBskyFeedDefs.isThreadViewPost(thread)) return null;
  if (!thread.replies || thread.replies.length === 0) return null;

  return (
    <Replies
      replies={thread.replies as any[]}
      pageUri={props.pageUri}
      parentPostUri={props.postUri}
      depth={props.depth + 1}
      parentAuthorDid={thread.post.author.did}
      rootAuthorDid={props.rootAuthorDid}
      documentUrls={props.documentUrls}
      docDid={props.docDid}
    />
  );
}
