import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useEffect, useState } from "react";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";
import { AppBskyFeedDefs, AppBskyFeedPost, RichText } from "@atproto/api";
import { Separator } from "components/Layout";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  BlueskyEmbed,
  PostNotAvailable,
} from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";

export const PubBlueskyPostBlock = (props: {
  post: PostView;
  className: string;
}) => {
  let post = props.post;
  switch (true) {
    case AppBskyFeedDefs.isBlockedPost(post) ||
      AppBskyFeedDefs.isBlockedAuthor(post) ||
      AppBskyFeedDefs.isNotFoundPost(post):
      return (
        <div className={`w-full`}>
          <PostNotAvailable />
        </div>
      );

    case AppBskyFeedDefs.validatePostView(post).success:
      let record = post.record as AppBskyFeedDefs.PostView["record"];
      let facets = record.facets;

      // silliness to get the text and timestamp from the record with proper types
      let text: string | null = null;
      let timestamp: string | undefined = undefined;
      if (AppBskyFeedPost.isRecord(record)) {
        text = (record as AppBskyFeedPost.Record).text;
        timestamp = (record as AppBskyFeedPost.Record).createdAt;
      }

      //getting the url to the post
      let postId = post.uri.split("/")[4];
      let url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;

      return (
        <div
          className={`
            ${props.className}
            block-border
            mb-2
      flex flex-col gap-2 relative w-full overflow-hidden group/blueskyPostBlock sm:p-3 p-2 text-sm text-secondary bg-bg-page
      `}
        >
          {post.author && record && (
            <>
              <div className="bskyAuthor w-full flex items-center gap-2">
                {post.author.avatar && (
                  <img
                    src={post.author?.avatar}
                    alt={`${post.author?.displayName}'s avatar`}
                    className="shink-0 w-8 h-8 rounded-full border border-border-light"
                  />
                )}
                <div className="grow flex flex-col gap-0.5 leading-tight">
                  <div className=" font-bold text-secondary">
                    {post.author?.displayName}
                  </div>
                  <a
                    className="text-xs text-tertiary hover:underline"
                    target="_blank"
                    href={`https://bsky.app/profile/${post.author?.handle}`}
                  >
                    @{post.author?.handle}
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 ">
                <div>
                  <pre className="whitespace-pre-wrap">
                    {BlueskyRichText({
                      record: record as AppBskyFeedPost.Record | null,
                    })}
                  </pre>
                </div>
                {post.embed && (
                  <BlueskyEmbed embed={post.embed} postUrl={url} />
                )}
              </div>
            </>
          )}
          <div className="w-full flex gap-2 items-center justify-between">
            <ClientDate date={timestamp} />
            <div className="flex gap-2 items-center">
              {post.replyCount && post.replyCount > 0 && (
                <>
                  <a
                    className="flex items-center gap-1 hover:no-underline"
                    target="_blank"
                    href={url}
                  >
                    {post.replyCount}
                    <CommentTiny />
                  </a>
                  <Separator classname="h-4" />
                </>
              )}

              <a className="" target="_blank" href={url}>
                <BlueskyTiny />
              </a>
            </div>
          </div>
        </div>
      );
  }
};

const ClientDate = (props: { date?: string }) => {
  let pageLoaded = useHasPageLoaded();
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
