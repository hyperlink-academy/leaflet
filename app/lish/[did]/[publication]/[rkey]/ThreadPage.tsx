"use client";
import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import useSWR, { preload } from "swr";
import { PageWrapper } from "components/Pages/Page";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { DotLoader } from "components/utils/DotLoader";
import {
  BlueskyEmbed,
  PostNotAvailable,
} from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { Separator } from "components/Layout";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { openPage, OpenPage } from "./PostPages";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

type ThreadViewPost = AppBskyFeedDefs.ThreadViewPost;
type NotFoundPost = AppBskyFeedDefs.NotFoundPost;
type BlockedPost = AppBskyFeedDefs.BlockedPost;
type ThreadType = ThreadViewPost | NotFoundPost | BlockedPost;

// SWR key for thread data
export const getThreadKey = (uri: string) => `thread:${uri}`;

// Fetch thread from API route
export async function fetchThread(uri: string): Promise<ThreadType> {
  const params = new URLSearchParams({ uri });
  const response = await fetch(`/api/bsky/thread?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch thread");
  }

  return response.json();
}

// Prefetch thread data
export const prefetchThread = (uri: string) => {
  preload(getThreadKey(uri), () => fetchThread(uri));
};

// Link component for opening thread pages with prefetching
export function ThreadLink(props: {
  threadUri: string;
  parent?: OpenPage;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { threadUri, parent, children, className, onClick } = props;

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    openPage(parent, { type: "thread", uri: threadUri });
  };

  const handlePrefetch = () => {
    prefetchThread(threadUri);
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onPointerDown={handlePrefetch}
    >
      {children}
    </button>
  );
}

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
  let cardBorderHidden = useCardBorderHidden(null);

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
      <ThreadPost
        post={thread}
        isMainPost={true}
        showReplyLine={false}
        threadUri={threadUri}
      />

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
  const record = postView.record as AppBskyFeedPost.Record;

  const postId = postView.uri.split("/")[4];
  const url = `https://bsky.app/profile/${postView.author.handle}/post/${postId}`;

  return (
    <div className="flex gap-2 relative">
      {/* Reply line connector */}
      {showReplyLine && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border-light" />
      )}

      <div className="flex flex-col items-center shrink-0">
        {postView.author.avatar ? (
          <img
            src={postView.author.avatar}
            alt={`${postView.author.displayName}'s avatar`}
            className="w-10 h-10 rounded-full border border-border-light"
          />
        ) : (
          <div className="w-10 h-10 rounded-full border border-border-light bg-border" />
        )}
      </div>

      <div
        className={`flex flex-col grow min-w-0 pb-3 ${isMainPost ? "pb-0" : ""}`}
      >
        <div className="flex items-center gap-2 leading-tight">
          <div className="font-bold text-secondary">
            {postView.author.displayName}
          </div>
          <a
            className="text-xs text-tertiary hover:underline"
            target="_blank"
            href={`https://bsky.app/profile/${postView.author.handle}`}
          >
            @{postView.author.handle}
          </a>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <div className="text-sm text-secondary">
            <BlueskyRichText record={record} />
          </div>
          {postView.embed && (
            <BlueskyEmbed embed={postView.embed} postUrl={url} />
          )}
        </div>

        <div className="flex gap-2 items-center justify-between mt-2">
          <ClientDate date={record.createdAt} />
          <div className="flex gap-2 items-center">
            {postView.replyCount != null && postView.replyCount > 0 && (
              <>
                {isMainPost ? (
                  <div className="flex items-center gap-1 hover:no-underline text-tertiary text-xs">
                    {postView.replyCount}
                    <CommentTiny />
                  </div>
                ) : (
                  <ThreadLink
                    threadUri={postView.uri}
                    parent={{ type: "thread", uri: threadUri }}
                    className="flex items-center gap-1 text-tertiary text-xs hover:text-accent-contrast"
                  >
                    {postView.replyCount}
                    <CommentTiny />
                  </ThreadLink>
                )}
                <Separator classname="h-4" />
              </>
            )}
            <a className="text-tertiary" target="_blank" href={url}>
              <BlueskyTiny />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Replies(props: {
  replies: (ThreadViewPost | NotFoundPost | BlockedPost)[];
  threadUri: string;
  depth: number;
}) {
  const { replies, threadUri, depth } = props;

  return (
    <div className="flex flex-col gap-0">
      {replies.map((reply, index) => {
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

        return (
          <div key={reply.post.uri} className="flex flex-col">
            <ReplyPost
              post={reply}
              showReplyLine={hasReplies || index < replies.length - 1}
              isLast={index === replies.length - 1 && !hasReplies}
              threadUri={threadUri}
            />
            {hasReplies && depth < 3 && (
              <div className="ml-5 pl-5 border-l border-border-light">
                <Replies
                  replies={reply.replies as any[]}
                  threadUri={threadUri}
                  depth={depth + 1}
                />
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
  const { post, showReplyLine, isLast, threadUri } = props;
  const postView = post.post;
  const record = postView.record as AppBskyFeedPost.Record;

  const postId = postView.uri.split("/")[4];
  const url = `https://bsky.app/profile/${postView.author.handle}/post/${postId}`;

  const parent = { type: "thread" as const, uri: threadUri };

  return (
    <div
      className="flex gap-2 relative py-2 px-2 hover:bg-bg-page rounded cursor-pointer"
      onClick={() => openPage(parent, { type: "thread", uri: postView.uri })}
    >
      <div className="flex flex-col items-center shrink-0">
        {postView.author.avatar ? (
          <img
            src={postView.author.avatar}
            alt={`${postView.author.displayName}'s avatar`}
            className="w-8 h-8 rounded-full border border-border-light"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-border-light bg-border" />
        )}
      </div>

      <div className="flex flex-col grow min-w-0">
        <div className="flex items-center gap-2 leading-tight text-sm">
          <div className="font-bold text-secondary">
            {postView.author.displayName}
          </div>
          <a
            className="text-xs text-tertiary hover:underline"
            target="_blank"
            href={`https://bsky.app/profile/${postView.author.handle}`}
            onClick={(e) => e.stopPropagation()}
          >
            @{postView.author.handle}
          </a>
        </div>

        <div className="text-sm text-secondary mt-0.5">
          <BlueskyRichText record={record} />
        </div>

        <div className="flex gap-2 items-center mt-1">
          <ClientDate date={record.createdAt} />
          {postView.replyCount != null && postView.replyCount > 0 && (
            <>
              <Separator classname="h-3" />
              <ThreadLink
                threadUri={postView.uri}
                parent={parent}
                className="flex items-center gap-1 text-tertiary text-xs hover:text-accent-contrast"
                onClick={(e) => e.stopPropagation()}
              >
                {postView.replyCount}
                <CommentTiny />
              </ThreadLink>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ClientDate = (props: { date?: string }) => {
  const pageLoaded = useHasPageLoaded();
  const formattedDate = useLocalizedDate(
    props.date || new Date().toISOString(),
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    },
  );

  if (!pageLoaded) return null;

  return <div className="text-xs text-tertiary">{formattedDate}</div>;
};
