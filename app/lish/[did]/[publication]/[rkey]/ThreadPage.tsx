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
  parentUri: string;
  pageId: string;
  pageOptions?: React.ReactNode;
  hasPageBackground: boolean;
}) {
  const { parentUri: parentUri, pageId, pageOptions } = props;
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
          <ThreadContent thread={thread} parentUri={parentUri} />
        ) : null}
      </div>
    </PageWrapper>
  );
}

function ThreadContent(props: { thread: ThreadType; parentUri: string }) {
  const { thread, parentUri: parentUri } = props;
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
    <div className="threadContent flex flex-col gap-0">
      {/* grandparent posts, if any */}
      {parents.map((parent, index) => (
        <div key={parent.post.uri} className="flex flex-col">
          <ThreadPost
            post={parent}
            isMainPost={false}
            showReplyLine={index < parents.length - 1 || true}
            parentUri={parentUri}
          />
        </div>
      ))}

      {/* Main post */}
      <div ref={mainPostRef}>
        <ThreadPost
          post={thread}
          isMainPost={true}
          showReplyLine={false}
          parentUri={parentUri}
        />
      </div>

      {/* Replies */}
      {thread.replies && thread.replies.length > 0 && (
        <div className="threadReplies flex flex-col mt-2 pt-2 border-t border-border-light">
          <Replies
            replies={thread.replies as any[]}
            parentUri={parentUri}
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
  parentUri: string;
}) {
  const { post, isMainPost, showReplyLine, parentUri } = props;
  const postView = post.post;
  const parent = { type: "thread" as const, uri: parentUri };

  return (
    <div className="threadPost flex gap-2 relative">
      {/* Reply line connector */}
      {showReplyLine && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border-light" />
      )}
      <BskyPostContent
        post={postView}
        parent={parent}
        showBlueskyLink={true}
        showEmbed={true}
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
  parentUri: string;
}) {
  const { replies, depth, parentAuthorDid, parentUri } = props;
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
    <div className="threadPageReplies flex flex-col gap-0">
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
            post={reply}
            isLast={index === replies.length - 1 && !hasReplies}
            parentUri={parentUri}
            toggleCollapsed={(uri) => toggleCollapsed(uri)}
            isCollapsed={isCollapsed}
            depth={props.depth}
          />
        );
      })}
      {parentUri && depth > 0 && replies.length > 3 && (
        <ThreadLink
          postUri={parentUri}
          parent={{ type: "thread", uri: parentUri }}
          className="flex justify-start text-sm text-accent-contrast h-fit hover:underline"
        >
          <div className="mx-[19px] w-0.5 h-[24px] bg-border-light" />
          View {replies.length - 3} more{" "}
          {replies.length === 4 ? "reply" : "replies"}
        </ThreadLink>
      )}
    </div>
  );
}

const ReplyPost = (props: {
  post: ThreadViewPost;
  isLast: boolean;
  parentUri: string;
  toggleCollapsed: (uri: string) => void;
  isCollapsed: boolean;
  depth: number;
}) => {
  const { post, parentUri } = props;
  const postView = post.post;

  const hasReplies = props.post.replies && props.post.replies.length > 0;

  return (
    <div className="threadReply relative flex flex-col">
      <BskyPostContent
        post={postView}
        parent={{ type: "thread", uri: parentUri }}
        showEmbed={false}
        showBlueskyLink={false}
        replyLine={
          props.depth > 0
            ? {
                onToggle: () => {
                  props.toggleCollapsed(props.parentUri);
                  console.log("click click");
                },
              }
            : undefined
        }
        quoteEnabled
        replyEnabled
        replyOnClick={(e) => {
          e.preventDefault();
          props.toggleCollapsed(post.post.uri);
        }}
        onEmbedClick={(e) => e.stopPropagation()}
        className="text-sm z-10"
      />
      {hasReplies && props.depth < 3 && (
        <div className="ml-[28px] flex">
          {!props.isCollapsed && (
            <div className="grow">
              <Replies
                parentUri={postView.uri}
                replies={props.post.replies as any[]}
                depth={props.depth + 1}
                parentAuthorDid={props.post.post.author.did}
              />
            </div>
          )}
        </div>
      )}

      {hasReplies && props.depth >= 3 && (
        <ThreadLink
          postUri={props.post.post.uri}
          parent={{ type: "thread", uri: parentUri }}
          className="text-left ml-10 text-sm text-accent-contrast hover:underline"
        >
          View more replies
        </ThreadLink>
      )}
    </div>
  );
};
