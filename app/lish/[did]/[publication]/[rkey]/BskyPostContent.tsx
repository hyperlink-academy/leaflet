"use client";
import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import {
  BlueskyEmbed,
} from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { OpenPage } from "./PostPages";
import { ThreadLink, QuotesLink } from "./PostLinks";

type PostView = AppBskyFeedDefs.PostView;

export function BskyPostContent(props: {
  post: PostView;
  parent?: OpenPage;
  linksEnabled?: boolean;
  avatarSize?: "sm" | "md";
  showEmbed?: boolean;
  showBlueskyLink?: boolean;
  onEmbedClick?: (e: React.MouseEvent) => void;
  onLinkClick?: (e: React.MouseEvent) => void;
}) {
  const {
    post,
    parent,
    linksEnabled = true,
    avatarSize = "md",
    showEmbed = true,
    showBlueskyLink = true,
    onEmbedClick,
    onLinkClick,
  } = props;

  const record = post.record as AppBskyFeedPost.Record;
  const postId = post.uri.split("/")[4];
  const url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;

  const avatarClass = avatarSize === "sm" ? "w-8 h-8" : "w-10 h-10";

  return (
    <>
      <div className="flex flex-col items-center shrink-0">
        {post.author.avatar ? (
          <img
            src={post.author.avatar}
            alt={`${post.author.displayName}'s avatar`}
            className={`${avatarClass} rounded-full border border-border-light`}
          />
        ) : (
          <div className={`${avatarClass} rounded-full border border-border-light bg-border`} />
        )}
      </div>

      <div className="flex flex-col grow min-w-0">
        <div className={`flex items-center gap-2 leading-tight ${avatarSize === "sm" ? "text-sm" : ""}`}>
          <div className="font-bold text-secondary">
            {post.author.displayName}
          </div>
          <a
            className="text-xs text-tertiary hover:underline"
            target="_blank"
            href={`https://bsky.app/profile/${post.author.handle}`}
            onClick={onLinkClick}
          >
            @{post.author.handle}
          </a>
        </div>

        <div className={`flex flex-col gap-2 ${avatarSize === "sm" ? "mt-0.5" : "mt-1"}`}>
          <div className="text-sm text-secondary">
            <BlueskyRichText record={record} />
          </div>
          {showEmbed && post.embed && (
            <div onClick={onEmbedClick}>
              <BlueskyEmbed embed={post.embed} postUrl={url} />
            </div>
          )}
        </div>

        <div className={`flex gap-2 items-center ${avatarSize === "sm" ? "mt-1" : "mt-2"}`}>
          <ClientDate date={record.createdAt} />
          <PostCounts
            post={post}
            parent={parent}
            linksEnabled={linksEnabled}
            showBlueskyLink={showBlueskyLink}
            url={url}
            onLinkClick={onLinkClick}
          />
        </div>
      </div>
    </>
  );
}

function PostCounts(props: {
  post: PostView;
  parent?: OpenPage;
  linksEnabled: boolean;
  showBlueskyLink: boolean;
  url: string;
  onLinkClick?: (e: React.MouseEvent) => void;
}) {
  const { post, parent, linksEnabled, showBlueskyLink, url, onLinkClick } = props;

  return (
    <div className="flex gap-2 items-center">
      {post.replyCount != null && post.replyCount > 0 && (
        <>
          <Separator classname="h-3" />
          {linksEnabled ? (
            <ThreadLink
              threadUri={post.uri}
              parent={parent}
              className="flex items-center gap-1 text-tertiary text-xs hover:text-accent-contrast"
              onClick={onLinkClick}
            >
              {post.replyCount}
              <CommentTiny />
            </ThreadLink>
          ) : (
            <div className="flex items-center gap-1 text-tertiary text-xs">
              {post.replyCount}
              <CommentTiny />
            </div>
          )}
        </>
      )}
      {post.quoteCount != null && post.quoteCount > 0 && (
        <>
          <Separator classname="h-3" />
          <QuotesLink
            postUri={post.uri}
            parent={parent}
            className="flex items-center gap-1 text-tertiary text-xs hover:text-accent-contrast"
            onClick={onLinkClick}
          >
            {post.quoteCount}
            <QuoteTiny />
          </QuotesLink>
        </>
      )}
      {showBlueskyLink && (
        <>
          <Separator classname="h-3" />
          <a
            className="text-tertiary"
            target="_blank"
            href={url}
            onClick={onLinkClick}
          >
            <BlueskyTiny />
          </a>
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
