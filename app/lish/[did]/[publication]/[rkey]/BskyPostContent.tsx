"use client";
import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { BlueskyEmbed } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { OpenPage } from "./PostPages";
import { ThreadLink, QuotesLink } from "./PostLinks";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { Avatar } from "components/Avatar";
import { timeAgo } from "src/utils/timeAgo";
import { ProfilePopover } from "components/ProfilePopover";

type PostView = AppBskyFeedDefs.PostView;

export function BskyPostContent(props: {
  post: PostView;
  parent?: OpenPage;
  avatarSize?: "tiny" | "medium" | "large" | "giant";
  className?: string;
  showEmbed?: boolean;
  showBlueskyLink?: boolean;
  onEmbedClick?: (e: React.MouseEvent) => void;
  quoteCountOnClick?: (e: React.MouseEvent) => void;
  replyCountOnClick?: (e: React.MouseEvent) => void;
}) {
  const {
    post,
    parent,
    avatarSize = "md",
    showEmbed = true,
    showBlueskyLink = true,
    onEmbedClick,
    quoteCountOnClick,
    replyCountOnClick,
  } = props;

  const record = post.record as AppBskyFeedPost.Record;
  const postId = post.uri.split("/")[4];
  const url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;

  return (
    <>
      <Avatar
        src={post.author.avatar}
        displayName={post.author.displayName}
        size={props.avatarSize ? props.avatarSize : "medium"}
      />

      <div className={`flex flex-col grow min-w-0 ${props.className}`}>
        <div
          className={`flex justify-between items-center gap-2 leading-tight `}
        >
          <div className="flex gap-2 items-center">
            <div className="font-bold text-secondary">
              {post.author.displayName}
            </div>
            <ProfilePopover
              trigger={
                <div className="text-sm text-tertiary hover:underline">
                  @{post.author.handle}
                </div>
              }
              didOrHandle={post.author.handle}
            />
          </div>
          <div className="text-sm text-tertiary">
            {timeAgo(record.createdAt, { compact: true })}
          </div>
        </div>

        <div
          className={`flex flex-col gap-2 ${avatarSize === "large" ? "mt-0.5" : "mt-1"}`}
        >
          <div className="text-sm text-secondary">
            <BlueskyRichText record={record} />
          </div>
          {showEmbed && post.embed && (
            <div onClick={onEmbedClick}>
              <BlueskyEmbed
                embed={post.embed}
                postUrl={url}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div className={`flex gap-2 items-center justify-between mt-2`}>
          <PostCounts
            post={post}
            parent={parent}
            replyCountOnClick={replyCountOnClick}
            quoteCountOnClick={quoteCountOnClick}
            showBlueskyLink={showBlueskyLink}
            url={url}
          />
          <div className="flex gap-3 items-center">
            {showBlueskyLink && (
              <>
                <a className="text-tertiary" target="_blank" href={url}>
                  <BlueskyLinkTiny />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PostCounts(props: {
  post: PostView;
  parent?: OpenPage;
  quoteCountOnClick?: (e: React.MouseEvent) => void;
  replyCountOnClick?: (e: React.MouseEvent) => void;
  showBlueskyLink: boolean;
  url: string;
}) {
  return (
    <div className="postCounts flex gap-2 items-center">
      {props.post.replyCount != null && props.post.replyCount > 0 && (
        <>
          {props.replyCountOnClick ? (
            <ThreadLink
              threadUri={props.post.uri}
              parent={parent}
              className="relative postRepliesLink flex items-center gap-1 text-tertiary text-xs hover:text-accent-contrast"
              onClick={props.replyCountOnClick}
            >
              <CommentTiny />
              {props.post.replyCount}
            </ThreadLink>
          ) : (
            <div className="postRepliesCount flex items-center gap-1 text-tertiary text-xs">
              <CommentTiny />
              {props.post.replyCount}
            </div>
          )}
        </>
      )}
      {props.post.quoteCount != null && props.post.quoteCount > 0 && (
        <>
          {props.quoteCountOnClick ? (
            <QuotesLink
              postUri={props.post.uri}
              parent={parent}
              className="relative flex items-center gap-1 text-tertiary text-xs hover:text-accent-contrast"
              onClick={props.quoteCountOnClick}
            >
              <QuoteTiny />
              {props.post.quoteCount}
            </QuotesLink>
          ) : (
            <div className="postQuoteCount flex items-center gap-1 text-tertiary text-xs">
              <QuoteTiny />
              {props.post.quoteCount}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const ClientDate = (props: { date?: string }) => {
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
