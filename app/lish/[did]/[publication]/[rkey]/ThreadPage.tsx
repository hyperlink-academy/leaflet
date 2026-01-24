"use client";
import { useEffect, useRef } from "react";
import { AppBskyFeedDefs } from "@atproto/api";
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
        <div className="threadReplies flex flex-col mt-4 pt-3  border-t border-border-light w-full">
          <Replies
            replies={post.replies as any[]}
            pageUri={post.post.uri}
            parentPostUri={post.post.uri}
            depth={0}
            parentAuthorDid={post.post.author.did}
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
      <div className="threadPost flex gap-2 relative w-full">
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
    <div className="threadPost flex gap-2 relative w-full pl-1">
      <CompactBskyPostContent
        post={postView}
        parent={page}
        quoteEnabled
        replyEnabled
        replyLine={{
          onToggle: () => {},
        }}
      />
    </div>
  );
}

function Replies(props: {
  replies: (ThreadViewPost | NotFoundPost | BlockedPost)[];
  depth: number;
  parentAuthorDid?: string;
  pageUri: string;
  parentPostUri: string;
}) {
  const { replies, depth, parentAuthorDid, pageUri, parentPostUri } = props;
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
    <div className="threadPageReplies flex flex-col gap-0 pt-1 pb-2">
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
            toggleCollapsed={(uri) => toggleCollapsed(uri)}
            isCollapsed={isCollapsed}
            depth={props.depth}
          />
        );
      })}
      {pageUri && depth > 0 && replies.length > 3 && (
        <ThreadLink
          postUri={pageUri}
          parent={{ type: "thread", uri: pageUri }}
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
  pageUri: string;
  parentPostUri: string;
  toggleCollapsed: (uri: string) => void;
  isCollapsed: boolean;
  depth: number;
}) => {
  const { post, pageUri, parentPostUri } = props;
  const postView = post.post;

  const hasReplies = props.post.replies && props.post.replies.length > 0;

  return (
    <div
      className={`threadReply relative flex flex-col ${props.depth === 0 && "mb-2"}`}
    >
      <BskyPostContent
        post={postView}
        parent={{ type: "thread", uri: pageUri }}
        showEmbed={false}
        showBlueskyLink={false}
        replyLine={
          props.depth > 0
            ? {
                onToggle: () => {
                  props.toggleCollapsed(parentPostUri);
                },
              }
            : undefined
        }
        quoteEnabled
        replyEnabled
        replyOnClick={(e) => {
          e.preventDefault();
          props.toggleCollapsed(post.post.uri);
          console.log(post.post.uri);
        }}
        onEmbedClick={(e) => e.stopPropagation()}
        className="text-sm z-10"
      />
      {hasReplies && props.depth < 3 && (
        <div className="ml-[28px] flex">
          {!props.isCollapsed && (
            <div className="grow">
              <Replies
                pageUri={pageUri}
                parentPostUri={post.post.uri}
                replies={props.post.replies as any[]}
                depth={props.depth + 1}
                parentAuthorDid={props.post.post.author.did}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
