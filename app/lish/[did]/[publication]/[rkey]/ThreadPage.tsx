"use client";
import { useEffect, useMemo, useRef } from "react";
import {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
  AppBskyEmbedExternal,
} from "@atproto/api";
import { AtUri } from "@atproto/syntax";
import useSWR from "swr";
import { PageWrapper } from "components/Pages/Page";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { DotLoader } from "components/utils/DotLoader";
import { PostNotAvailable } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { useThreadState } from "src/useThreadState";
import {
  BskyPostContent,
  CompactBskyPostContent,
  ClientDate,
} from "./BskyPostContent";
import {
  ThreadLink,
  getThreadKey,
  fetchThread,
  prefetchThread,
} from "./PostLinks";
import { useDocument } from "contexts/DocumentContext";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { QuoteContent } from "./Interactions/Quotes";
import {
  decodeQuotePosition,
  type QuotePosition,
} from "./quotePosition";

// Re-export for backwards compatibility
export { ThreadLink, getThreadKey, fetchThread, prefetchThread, ClientDate };

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

// Check if a URL matches any of the document's known URLs,
// and extract the quote position if present
function matchDocumentUrl(
  uri: string,
  documentUrls: string[],
): { url: string; quotePosition: QuotePosition | null } | null {
  try {
    const url = new URL(uri);
    const parts = url.pathname.split("/l-quote/");
    const pathWithoutQuote = parts[0];
    const quoteParam = parts[1];
    const fullUrlWithoutQuote = (url.origin + pathWithoutQuote).replace(
      /\/$/,
      "",
    );

    for (const docUrl of documentUrls) {
      const normalized = docUrl.replace(/\/$/, "");
      if (fullUrlWithoutQuote === normalized) {
        return {
          url: uri,
          quotePosition: quoteParam
            ? decodeQuotePosition(quoteParam)
            : null,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
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
    const match = matchDocumentUrl(
      post.embed.external.uri,
      documentUrls,
    );
    if (match) return { ...match, isEmbed: true };
  }

  return null;
}

export function ThreadPage(props: {
  parentUri: string;
  pageId: string;
  pageOptions?: React.ReactNode;
  hasPageBackground: boolean;
}) {
  const { parentUri, pageId, pageOptions } = props;
  const drawer = useDrawerOpen(parentUri);

  const {
    data: thread,
    isLoading,
    error,
  } = useSWR(parentUri ? getThreadKey(parentUri) : null, () =>
    fetchThread(parentUri),
  );

  return (
    <PageWrapper
      pageType="doc"
      fullPageScroll={false}
      id={`post-page-${pageId}`}
      drawerOpen={false}
      pageOptions={pageOptions}
      fixedWidth
    >
      <div className="flex flex-col sm:px-4 px-3 sm:pt-3 pt-2 pb-1 sm:pb-4 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
            <span>loading thread</span>
            <DotLoader />
          </div>
        ) : error ? (
          <div className="text-tertiary italic text-sm text-center py-8">
            Failed to load thread
          </div>
        ) : thread ? (
          <ThreadContent post={thread} parentUri={parentUri} />
        ) : null}
      </div>
    </PageWrapper>
  );
}

function ThreadContent(props: { post: ThreadType; parentUri: string }) {
  const { post, parentUri } = props;
  const mainPostRef = useRef<HTMLDivElement>(null);

  // Compute document URLs for leaflet link detection
  const {
    uri: docUri,
    normalizedDocument,
    normalizedPublication,
  } = useDocument();
  const docAtUri = useMemo(() => new AtUri(docUri), [docUri]);
  const docDid = docAtUri.host;

  const documentUrls = useMemo(() => {
    const urls: string[] = [];
    const canonicalUrl = getDocumentURL(
      normalizedDocument,
      docUri,
      normalizedPublication,
    );
    if (canonicalUrl.startsWith("http")) {
      urls.push(canonicalUrl);
    } else {
      urls.push(`https://leaflet.pub${canonicalUrl}`);
    }
    urls.push(`https://leaflet.pub/p/${docAtUri.host}/${docAtUri.rkey}`);
    if (
      normalizedDocument.site &&
      normalizedDocument.site.startsWith("http")
    ) {
      const path = normalizedDocument.path || "/" + docAtUri.rkey;
      urls.push(normalizedDocument.site + path);
    }
    return urls;
  }, [docUri, docAtUri, normalizedDocument, normalizedPublication]);

  // Scroll the main post into view when the thread loads
  useEffect(() => {
    if (mainPostRef.current) {
      mainPostRef.current.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }
  }, []);

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

      {/* Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="threadReplies flex flex-col mt-4 pt-4  border-t border-border-light w-full">
          <Replies
            replies={post.replies as any[]}
            pageUri={post.post.uri}
            parentPostUri={post.post.uri}
            depth={0}
            parentAuthorDid={post.post.author.did}
            rootAuthorDid={rootAuthorDid}
            documentUrls={documentUrls}
            docDid={docDid}
          />
        </div>
      )}
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
  const collapsedThreads = useThreadState((s) => s.collapsedThreads);
  const toggleCollapsed = useThreadState((s) => s.toggleCollapsed);

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
    <div className="replies flex flex-col gap-0 w-full">
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
        const isCollapsed = collapsedThreads.has(reply.post.uri);

        return (
          <ReplyPost
            key={reply.post.uri}
            post={reply}
            isLast={index === replies.length - 1 && !hasReplies}
            pageUri={pageUri}
            parentPostUri={parentPostUri}
            toggleCollapsed={toggleCollapsed}
            isCollapsed={isCollapsed}
            depth={props.depth}
            rootAuthorDid={rootAuthorDid}
            documentUrls={documentUrls}
            docDid={docDid}
          />
        );
      })}
    </div>
  );
}

const ReplyPost = (props: {
  post: ThreadViewPost;
  isLast: boolean;
  pageUri: string;
  parentPostUri: string;
  toggleCollapsed: (uri: string) => void;
  isCollapsed: boolean;
  depth: number;
  rootAuthorDid: string;
  documentUrls: string[];
  docDid: string;
}) => {
  const { post, pageUri, parentPostUri, rootAuthorDid, documentUrls, docDid } = props;

  // Flatten same-author chains
  const chain = flattenSameAuthorChain(post, rootAuthorDid);
  const lastInChain = chain[chain.length - 1];
  const hasReplies = lastInChain.replies && lastInChain.replies.length > 0;
  const isTruncated =
    !hasReplies &&
    lastInChain.post.replyCount != null &&
    lastInChain.post.replyCount > 0;

  return (
    <div className="flex h-fit relative">
      {props.depth > 0 && (
        <>
          <div className="absolute replyLine top-0 bottom-0 left-0 w-6 pointer-events-none ">
            <div className="bg-border-light w-[2px] h-full mx-auto" />
          </div>
          <button
            className="absolute top-0 bottom-0 left-0 w-6 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.toggleCollapsed(parentPostUri);
            }}
          />
        </>
      )}
      <div
        className={`reply relative flex flex-col w-full ${props.depth === 0 && "mb-3"}`}
      >
        {/* Render chain: intermediate posts compact, last post full */}
        {chain.length > 1 ? (
          <>
            {chain.slice(0, -1).map((chainPost) => (
              <div
                key={chainPost.post.uri}
                className="flex gap-2 relative w-full pl-[6px] pb-2"
              >
                <div className="absolute top-0 bottom-0 left-[6px] w-5">
                  <div className="bg-border-light w-[2px] h-full mx-auto" />
                </div>
                <ReplyPostContent
                  post={chainPost.post}
                  pageUri={pageUri}
                  documentUrls={documentUrls}
                  docDid={docDid}
                  compact
                />
              </div>
            ))}
            <ReplyPostContent
              post={lastInChain.post}
              pageUri={pageUri}
              documentUrls={documentUrls}
              docDid={docDid}
              compact
              toggleCollapsed={() =>
                props.toggleCollapsed(lastInChain.post.uri)
              }
            />
          </>
        ) : (
          <ReplyPostContent
            post={post.post}
            pageUri={pageUri}
            documentUrls={documentUrls}
            docDid={docDid}
            toggleCollapsed={() => props.toggleCollapsed(post.post.uri)}
          />
        )}

        {/* Render child replies */}
        {hasReplies && props.depth < 10 && (
          <div className="ml-[28px] flex grow">
            {!props.isCollapsed && (
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
            )}
          </div>
        )}

        {/* Auto-load truncated replies */}
        {isTruncated && props.depth < 10 && !props.isCollapsed && (
          <div className="ml-[28px] flex grow">
            <SubThread
              postUri={lastInChain.post.uri}
              pageUri={pageUri}
              depth={props.depth}
              rootAuthorDid={rootAuthorDid}
              documentUrls={documentUrls}
              docDid={docDid}
            />
          </div>
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
      <div className="flex flex-col w-full">
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
    <div className="flex flex-col w-full">
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
        className="text-sm"
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
  const { data: thread, isLoading } = useSWR(
    getThreadKey(props.postUri),
    () => fetchThread(props.postUri),
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
