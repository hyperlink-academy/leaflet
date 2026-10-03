"use client";
import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { BlueskyEmbed } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { OpenPage } from "./postPageState";
import { useOpenThread } from "./Interactions/drawerThreadContext";
import { ThreadLink, QuotesLink, useThreadPrefetchHandlers } from "./PostLinks";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { Avatar } from "components/Avatar";
import { timeAgo } from "src/utils/timeAgo";
import { ProfilePopover } from "components/ProfilePopover";
import { QuotePosition } from "src/utils/quotePosition";
import { QuoteContent } from "./Interactions/Quotes";
import type { BskyPostMedia } from "src/utils/bskyPostView";

type PostView = AppBskyFeedDefs.PostView;

export function BskyPostContent(props: {
  post: PostView;
  parent: OpenPage | undefined;
  avatarSize?: "tiny" | "small" | "medium" | "large" | "giant";
  className?: string;
  showEmbed?: boolean;
  compactEmbed?: boolean;
  showBlueskyLink?: boolean;
  linkTimestamp?: boolean;
  showInteractions?: boolean;
  quoteEnabled?: boolean;
  replyEnabled?: boolean;
  replyOnClick?: (e: React.MouseEvent) => void;
  clientHost?: string;
  // The overlay that opens the thread is a button, which the editor's block
  // mouse handlers skip, so it would make the post unselectable there.
  openThreadOnClick?: boolean;
  hasQuote?: {
    position: QuotePosition;
    index: number;
    did: string;
  };
}) {
  const {
    post,
    parent,
    avatarSize = "medium",
    showEmbed = true,
    compactEmbed = false,
    showBlueskyLink = true,
    showInteractions = true,
    quoteEnabled,
    replyEnabled,
    replyOnClick,
    clientHost = "bsky.app",
    openThreadOnClick = true,
    hasQuote,
  } = props;
  const openThread = useOpenThread();
  const threadPrefetchHandlers = useThreadPrefetchHandlers(post.uri);

  const record = post.record as AppBskyFeedPost.Record;
  const postId = post.uri.split("/")[4];
  const url = `https://${clientHost}/profile/${post.author.handle}/post/${postId}`;

  // Only allow opening the thread page when there's a discussion to show
  const hasThreadContent =
    openThreadOnClick &&
    ((post.replyCount ?? 0) > 0 || (post.quoteCount ?? 0) > 0);

  return (
    <div className={`bskyPost relative flex flex-col w-full `}>
      {hasThreadContent && (
        <button
          className="absolute inset-0"
          {...threadPrefetchHandlers}
          onClick={() => {
            openThread(parent, { type: "thread", uri: post.uri });
          }}
        />
      )}

      <div
        className={`flex gap-2 text-left w-full pointer-events-none ${props.className}`}
      >
        <div className="flex flex-col items-start shrink-0 w-fit pointer-events-auto">
          <Avatar
            src={post.author.avatar}
            displayName={
              post.author.displayName
                ? post.author.displayName
                : post.author.handle
            }
            size={avatarSize ? avatarSize : "medium"}
          />
        </div>

        <div
          className={`bskyPostContent flex flex-col grow text-left w-full min-w-0 ${props.avatarSize === "small" ? "mt-0.5" : props.avatarSize === "large" ? "mt-2" : "mt-1"}`}
          style={{ wordBreak: "break-word" }}
        >
          <PostInfo
            displayName={post.author.displayName}
            handle={post.author.handle}
            createdAt={record.createdAt}
          />
            url={props.linkTimestamp ? url : undefined}

          <div className={`bskyPostBody flex flex-col min-w-0 w-full`}>
            {props.hasQuote && (
              <QuoteContent
                index={props.hasQuote?.index}
                did={props.hasQuote?.did}
                position={props.hasQuote?.position}
              />
            )}
            <div className="bskyPostTextContent text-secondary mt-0.5">
              <BlueskyRichText record={record} />
            </div>
            {showEmbed && post.embed && (
              <div
                className="bskyPostEmbedWrapper pointer-events-auto relative mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <BlueskyEmbed
                  parent={parent}
                  embed={post.embed}
                  compact={compactEmbed}
                  postUrl={url}
                  className="text-sm"
                />
              </div>
            )}
          </div>
          <PostCountsAndLink
            post={post}
            parent={parent}
            url={url}
            showBlueskyLink={showBlueskyLink}
            showInteractions={showInteractions}
            quoteEnabled={quoteEnabled}
            replyEnabled={replyEnabled}
            replyOnClick={replyOnClick}
          />
        </div>
      </div>
    </div>
  );
}

// Just the post's images or video, with the counts and link out below.
export function BskyPostMediaContent(props: {
  post: PostView;
  media: BskyPostMedia;
  parent: OpenPage | undefined;
  className?: string;
  quoteEnabled?: boolean;
  replyEnabled?: boolean;
  clientHost?: string;
  openThreadOnClick?: boolean;
}) {
  const {
    post,
    parent,
    clientHost = "bsky.app",
    openThreadOnClick = true,
  } = props;
  const openThread = useOpenThread();
  const threadPrefetchHandlers = useThreadPrefetchHandlers(post.uri);

  const postId = post.uri.split("/")[4];
  const url = `https://${clientHost}/profile/${post.author.handle}/post/${postId}`;
  const hasThreadContent =
    openThreadOnClick &&
    ((post.replyCount ?? 0) > 0 || (post.quoteCount ?? 0) > 0);

  return (
    <div className={`bskyPost bskyPostMedia relative flex flex-col w-full`}>
      {hasThreadContent && (
        <button
          className="absolute inset-0"
          {...threadPrefetchHandlers}
          onClick={() => {
            openThread(parent, { type: "thread", uri: post.uri });
          }}
        />
      )}
      <div
        className={`flex flex-col w-full pointer-events-none ${props.className}`}
      >
        <div
          className="bskyPostEmbedWrapper pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          <BlueskyEmbed
            parent={parent}
            embed={props.media}
            postUrl={url}
            className="text-sm"
          />
        </div>
        <PostCountsAndLink
          post={post}
          parent={parent}
          url={url}
          showBlueskyLink
          showInteractions
          quoteEnabled={props.quoteEnabled}
          replyEnabled={props.replyEnabled}
          handle={post.author.handle}
        />
      </div>
    </div>
  );
}

function PostCountsAndLink(props: {
  post: PostView;
  parent: OpenPage | undefined;
  url: string;
  showBlueskyLink: boolean;
  showInteractions: boolean;
  quoteEnabled?: boolean;
  replyEnabled?: boolean;
  replyOnClick?: (e: React.MouseEvent) => void;
  // Credits the author when the byline above isn't shown.
  handle?: string;
}) {
  const { post, showBlueskyLink, showInteractions } = props;
  const hasCounts = (post.quoteCount ?? 0) > 0 || (post.replyCount ?? 0) > 0;
  if (!showBlueskyLink && !(showInteractions && hasCounts)) return null;

  return (
    <div
      className={`postCountsAndLink flex gap-2 items-center justify-between  pointer-events-auto mt-2`}
    >
      {showInteractions ? (
        // Sized to its counts, so the handle beside it only truncates when it
        // can't fit.
        <div className="shrink-0">
          <PostCounts
            post={post}
            parent={props.parent}
            replyEnabled={props.replyEnabled}
            replyOnClick={props.replyOnClick}
            quoteEnabled={props.quoteEnabled}
            showBlueskyLink={showBlueskyLink}
            url={props.url}
          />
        </div>
      ) : (
        <div />
      )}

      <div className="flex gap-3 items-center min-w-0">
        {props.handle && (
          <ProfilePopover
            triggerClassName="min-w-0 max-w-full"
            trigger={
              <div className="text-xs text-tertiary truncate hover:underline">
                @{props.handle}
              </div>
            }
            didOrHandle={props.handle}
          />
        )}
        {showBlueskyLink && (
          <a
            className="text-tertiary relative shrink-0 hover:text-accent-contrast"
            target="_blank"
            href={props.url}
          >
            <BlueskyLinkTiny />
          </a>
        )}
      </div>
    </div>
  );
}

export function CompactBskyPostContent(props: {
  post: PostView;
  parent: OpenPage;
  className?: string;
  quoteEnabled?: boolean;
  replyEnabled?: boolean;
  replyOnClick?: (e: React.MouseEvent) => void;
  clientHost?: string;
}) {
  const {
    post,
    parent,
    quoteEnabled,
    replyEnabled,
    replyOnClick,
    clientHost = "bsky.app",
  } = props;
  const openThread = useOpenThread();
  const threadPrefetchHandlers = useThreadPrefetchHandlers(post.uri);

  const record = post.record as AppBskyFeedPost.Record;
  const postId = post.uri.split("/")[4];
  const url = `https://${clientHost}/profile/${post.author.handle}/post/${postId}`;

  // Only allow opening the thread page when there's a discussion to show
  const hasThreadContent =
    (post.replyCount ?? 0) > 0 || (post.quoteCount ?? 0) > 0;

  return (
    <div className="bskyPost relative flex flex-col w-full">
      {hasThreadContent && (
        <button
          className="absolute inset-0 "
          {...threadPrefetchHandlers}
          onClick={() => {
            openThread(parent, { type: "thread", uri: post.uri });
          }}
        />
      )}
      <div className={`flex gap-2 text-left w-full ${props.className}`}>
        <Avatar
          src={post.author.avatar}
          displayName={post.author.displayName}
          size="small"
        />
        <div className={`flex flex-col min-w-0 w-full`}>
          <button
            className={`bskyPostTextContent flex flex-col grow mt-0.5 text-left text-xs text-tertiary ${hasThreadContent ? "" : "cursor-default"}`}
            {...(hasThreadContent ? threadPrefetchHandlers : {})}
            onClick={
              hasThreadContent
                ? () => {
                    openThread(parent, { type: "thread", uri: post.uri });
                  }
                : undefined
            }
          >
            <PostInfo
              displayName={post.author.displayName}
              handle={post.author.handle}
              createdAt={record.createdAt}
              compact
            />

            <div className="postContent flex flex-col gap-2 mt-0.5">
              <div className="line-clamp-3 text-tertiary text-xs">
                <BlueskyRichText record={record} />
              </div>
            </div>
          </button>
          {(post.quoteCount && post.quoteCount > 0) ||
          (post.replyCount && post.replyCount > 0) ? (
            <div className="postCountsAndLink flex gap-2 items-center justify-between mt-2">
              <PostCounts
                post={post}
                parent={parent}
                replyEnabled={replyEnabled}
                replyOnClick={replyOnClick}
                quoteEnabled={quoteEnabled}
                showBlueskyLink={false}
                url={url}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PostInfo(props: {
  displayName?: string | null;
  handle: string;
  createdAt: string;
  compact?: boolean;
}) {
  url?: string;
  const { displayName, handle, createdAt, compact = false } = props;

  const timestampClassName = `${compact ? "text-xs" : "text-sm"} text-tertiary shrink-0`;
  return (
    <div className="postInfo flex items-center gap-2 leading-tight w-full">
      <ProfilePopover
        trigger={
          <div className="flex gap-2 items-baseline min-w-0 w-full">
            <div className={`font-bold text-secondary truncate min-w-0`}>
              {displayName ? displayName : handle}
            </div>
            {displayName && (
              <div
                className={`truncate min-w-0 shrink pointer-events-auto ${compact ? "text-xs" : "text-sm"} text-tertiary hover:underline`}
              >
                @{handle}
              </div>
            )}
          </div>
        }
        didOrHandle={handle}
      />
      <div className="w-1 h-1 rounded-full bg-border shrink-0" />
      {props.url ? (
        <a
          className={`${timestampClassName} relative pointer-events-auto hover:underline`}
          target="_blank"
          href={props.url}
        >
          {timeAgo(createdAt, { compact: true })}
        </a>
      ) : (
        <div className={timestampClassName}>
          {timeAgo(createdAt, { compact: true })}
        </div>
      )}
    </div>
  );
}

function PostCounts(props: {
  post: PostView;
  parent?: OpenPage;
  quoteEnabled?: boolean;
  replyEnabled?: boolean;
  replyOnClick?: (e: React.MouseEvent) => void;
  showBlueskyLink: boolean;
  url: string;
}) {
  const replyContent = props.post.replyCount != null &&
    props.post.replyCount > 0 && (
      <div className="postRepliesCount flex items-center gap-1 text-xs">
        <CommentTiny />
        {props.post.replyCount}
      </div>
    );

  const quoteContent = props.post.quoteCount != null &&
    props.post.quoteCount > 0 && (
      <div className="postQuoteCount flex items-center gap-1  text-xs">
        <QuoteTiny />
        {props.post.quoteCount}
      </div>
    );

  return (
    <div className="postCounts flex gap-2 items-center w-full text-tertiary mb-1">
      {replyContent &&
        (props.replyEnabled ? (
          <ThreadLink
            postUri={props.post.uri}
            parent={props.parent}
            className="relative postRepliesLink hover:text-accent-contrast"
            onClick={props.replyOnClick}
          >
            {replyContent}
          </ThreadLink>
        ) : (
          replyContent
        ))}
      {quoteContent &&
        (props.quoteEnabled ? (
          <QuotesLink
            postUri={props.post.uri}
            parent={props.parent}
            className="relative hover:text-accent-contrast"
          >
            {quoteContent}
          </QuotesLink>
        ) : (
          quoteContent
        ))}
    </div>
  );
}
