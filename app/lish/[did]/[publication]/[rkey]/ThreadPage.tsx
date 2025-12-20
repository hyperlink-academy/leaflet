"use client";
import { useEffect, useRef } from "react";
import { AppBskyFeedDefs } from "@atproto/api";
import useSWR from "swr";
import { PageWrapper } from "components/Pages/Page";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { DotLoader } from "components/utils/DotLoader";
import { PostNotAvailable } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { openPage } from "./PostPages";
import { useThreadState } from "src/useThreadState";
import { BskyPostContent, ClientDate } from "./BskyPostContent";
import {
  ThreadLink,
  getThreadKey,
  fetchThread,
  prefetchThread,
} from "./PostLinks";

// Re-export for backwards compatibility
export { ThreadLink, getThreadKey, fetchThread, prefetchThread, ClientDate };

type ThreadViewPost = AppBskyFeedDefs.ThreadViewPost;
type NotFoundPost = AppBskyFeedDefs.NotFoundPost;
type BlockedPost = AppBskyFeedDefs.BlockedPost;
type ThreadType = ThreadViewPost | NotFoundPost | BlockedPost;

export function ThreadPage(props: {
  threadUri: string;
  pageId: string;
  pageOptions?: React.ReactNode;
  hasPageBackground: boolean;
}) {
  const { threadUri, pageId, pageOptions } = props;
  const drawer = useDrawerOpen(threadUri);

  const {
    data: thread,
    isLoading,
    error,
  } = useSWR(threadUri ? getThreadKey(threadUri) : null, () =>
    fetchThread(threadUri),
  );

  return (
    <PageWrapper
      pageType="doc"
      fullPageScroll={false}
      id={`post-page-${pageId}`}
      drawerOpen={!!drawer}
      pageOptions={pageOptions}
    >
      <div className="flex flex-col sm:px-4 px-3 sm:pt-3 pt-2 pb-1 sm:pb-4">
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
          <ThreadContent thread={thread} threadUri={threadUri} />
        ) : null}
      </div>
    </PageWrapper>
  );
}

function ThreadContent(props: { thread: ThreadType; threadUri: string }) {
  const { thread, threadUri } = props;
  const mainPostRef = useRef<HTMLDivElement>(null);

  // Scroll the main post into view when the thread loads
  useEffect(() => {
    if (mainPostRef.current) {
      mainPostRef.current.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }
  }, []);

  if (AppBskyFeedDefs.isNotFoundPost(thread)) {
    return <PostNotAvailable />;
  }

  if (AppBskyFeedDefs.isBlockedPost(thread)) {
    return (
      <div className="text-tertiary italic text-sm text-center py-8">
        This post is blocked
      </div>
    );
  }

  if (!AppBskyFeedDefs.isThreadViewPost(thread)) {
    return <PostNotAvailable />;
  }

  // Collect all parent posts in order (oldest first)
  const parents: ThreadViewPost[] = [];
  let currentParent = thread.parent;
  while (currentParent && AppBskyFeedDefs.isThreadViewPost(currentParent)) {
    parents.unshift(currentParent);
    currentParent = currentParent.parent;
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Parent posts */}
      {parents.map((parent, index) => (
        <div key={parent.post.uri} className="flex flex-col">
          <ThreadPost
            post={parent}
            isMainPost={false}
            showReplyLine={index < parents.length - 1 || true}
            threadUri={threadUri}
          />
        </div>
      ))}

      {/* Main post */}
      <div ref={mainPostRef}>
        <ThreadPost
          post={thread}
          isMainPost={true}
          showReplyLine={false}
          threadUri={threadUri}
        />
      </div>

      {/* Replies */}
      {thread.replies && thread.replies.length > 0 && (
        <div className="flex flex-col mt-2 pt-2 border-t border-border-light">
          <div className="text-tertiary text-xs font-bold mb-2 px-2">
            Replies
          </div>
          <Replies
            replies={thread.replies as any[]}
            threadUri={threadUri}
            depth={0}
            parentAuthorDid={thread.post.author.did}
          />
        </div>
      )}
    </div>
  );
}

function ThreadPost(props: {
  post: ThreadViewPost;
  isMainPost: boolean;
  showReplyLine: boolean;
  threadUri: string;
}) {
  const { post, isMainPost, showReplyLine, threadUri } = props;
  const postView = post.post;
  const parent = { type: "thread" as const, uri: threadUri };

  return (
    <div className="flex gap-2 relative">
      {/* Reply line connector */}
      {showReplyLine && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border-light" />
      )}

      <BskyPostContent
        post={postView}
        parent={parent}
        linksEnabled={!isMainPost}
        showBlueskyLink={true}
        showEmbed={true}
      />
    </div>
  );
}

function Replies(props: {
  replies: (ThreadViewPost | NotFoundPost | BlockedPost)[];
  threadUri: string;
  depth: number;
  parentAuthorDid?: string;
}) {
  const { replies, threadUri, depth, parentAuthorDid } = props;
  const collapsedThreads = useThreadState((s) => s.collapsedThreads);
  const toggleCollapsed = useThreadState((s) => s.toggleCollapsed);

  // Sort replies so that replies from the parent author come first
  const sortedReplies = parentAuthorDid
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
    : replies;

  return (
    <div className="flex flex-col gap-0">
      {sortedReplies.map((reply, index) => {
        if (AppBskyFeedDefs.isNotFoundPost(reply)) {
          return (
            <div
              key={`not-found-${index}`}
              className="text-tertiary italic text-xs py-2 px-2"
            >
              Post not found
            </div>
          );
        }

        if (AppBskyFeedDefs.isBlockedPost(reply)) {
          return (
            <div
              key={`blocked-${index}`}
              className="text-tertiary italic text-xs py-2 px-2"
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
        const replyCount = reply.replies?.length ?? 0;

        return (
          <div key={reply.post.uri} className="flex flex-col">
            <ReplyPost
              post={reply}
              showReplyLine={hasReplies || index < replies.length - 1}
              isLast={index === replies.length - 1 && !hasReplies}
              threadUri={threadUri}
            />
            {hasReplies && depth < 3 && (
              <div className="ml-2 flex">
                {/* Clickable collapse line - w-8 matches avatar width, centered line aligns with avatar center */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(reply.post.uri);
                  }}
                  className="group w-8 flex justify-center cursor-pointer shrink-0"
                  aria-label={
                    isCollapsed ? "Expand replies" : "Collapse replies"
                  }
                >
                  <div className="w-0.5 h-full bg-border-light group-hover:bg-accent-contrast group-hover:w-1 transition-all" />
                </button>
                {isCollapsed ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(reply.post.uri);
                    }}
                    className="text-xs text-accent-contrast hover:underline py-1 pl-1"
                  >
                    Show {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </button>
                ) : (
                  <div className="grow">
                    <Replies
                      replies={reply.replies as any[]}
                      threadUri={threadUri}
                      depth={depth + 1}
                      parentAuthorDid={reply.post.author.did}
                    />
                  </div>
                )}
              </div>
            )}
            {hasReplies && depth >= 3 && (
              <ThreadLink
                threadUri={reply.post.uri}
                parent={{ type: "thread", uri: threadUri }}
                className="ml-12 text-xs text-accent-contrast hover:underline py-1"
              >
                View more replies
              </ThreadLink>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReplyPost(props: {
  post: ThreadViewPost;
  showReplyLine: boolean;
  isLast: boolean;
  threadUri: string;
}) {
  const { post, threadUri } = props;
  const postView = post.post;
  const parent = { type: "thread" as const, uri: threadUri };

  return (
    <div
      className="flex gap-2 relative py-2 px-2 hover:bg-bg-page rounded cursor-pointer"
      onClick={() => openPage(parent, { type: "thread", uri: postView.uri })}
    >
      <BskyPostContent
        post={postView}
        parent={parent}
        linksEnabled={true}
        avatarSize="sm"
        showEmbed={false}
        showBlueskyLink={false}
        onLinkClick={(e) => e.stopPropagation()}
        onEmbedClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
