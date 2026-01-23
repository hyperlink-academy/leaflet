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
    <div className="threadContent flex flex-col gap-0">
      {/* grandparent posts, if any */}
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
        <div className="threadReplies flex flex-col mt-2 pt-2 border-t border-border-light">
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
        quoteCountOnClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          openPage(parent, { type: "quotes", uri: postView.uri });
        }}
        replyCountOnClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      />
    </div>
  );
}

function Replies(props: {
  replies: (ThreadViewPost | NotFoundPost | BlockedPost)[];
  threadUri: string;
  depth: number;
  parentAuthorDid?: string;
  parentUri?: string;
}) {
  const { replies, threadUri, depth, parentAuthorDid, parentUri } = props;
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
            threadUri={threadUri}
            toggleCollapsed={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (parentUri) toggleCollapsed(parentUri);
              console.log("collapse?");
            }}
            isCollapsed={isCollapsed}
            depth={props.depth}
          />
        );
      })}
      {parentUri && depth > 0 && replies.length > 3 && (
        <ThreadLink
          threadUri={parentUri}
          parent={{ type: "thread", uri: threadUri }}
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
  threadUri: string;
  toggleCollapsed: (e: React.MouseEvent) => void;
  isCollapsed: boolean;
  depth: number;
}) => {
  const { post, threadUri } = props;
  const postView = post.post;
  const parent = { type: "thread" as const, uri: threadUri };

  const hasReplies = props.post.replies && props.post.replies.length > 0;

  // was in the middle of trying to get the right set of comments to close when this line is clicked
  // then i really need to style the parent and grandparent threads, hide some of the content unless its the main post
  // the thread line on them is also weird
  return (
    <div className="threadReply relative flex flex-col">
      {props.depth > 0 && (
        <button
          onClick={(e) => {
            props.toggleCollapsed(e);
          }}
          className="replyThreadLine absolute top-0 bottom-0 left-1 z-0 cursor-pointer shrink-0 "
          aria-label={"Toggle replies"}
        >
          <div className="mx-[15px] w-0.5 h-full bg-border-light" />
        </button>
      )}

      <button
        className="replyThreadPost flex gap-2  text-left relative py-2 px-2  rounded cursor-pointer"
        onClick={() => {
          openPage(parent, { type: "thread", uri: postView.uri });
        }}
      >
        <BskyPostContent
          post={postView}
          parent={parent}
          showEmbed={false}
          showBlueskyLink={false}
          quoteCountOnClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPage(parent, { type: "quotes", uri: postView.uri });
          }}
          replyCountOnClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.toggleCollapsed();
          }}
          onEmbedClick={(e) => e.stopPropagation()}
          className="text-sm z-10"
        />
      </button>
      {hasReplies && props.depth < 3 && (
        <div className="ml-[28px] flex">
          {!props.isCollapsed && (
            <div className="grow">
              <Replies
                parentUri={postView.uri}
                replies={props.post.replies as any[]}
                threadUri={threadUri}
                depth={props.depth + 1}
                parentAuthorDid={props.post.post.author.did}
              />
            </div>
          )}
        </div>
      )}

      {hasReplies && props.depth >= 3 && (
        <ThreadLink
          threadUri={props.post.post.uri}
          parent={{ type: "thread", uri: threadUri }}
          className="text-left ml-10 text-sm text-accent-contrast hover:underline"
        >
          View more replies
        </ThreadLink>
      )}
    </div>
  );
};
