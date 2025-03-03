import { useEntitySetContext } from "components/EntitySetProvider";
import { useEffect, useState } from "react";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "../Block";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";
import { AppBskyFeedDefs, AppBskyFeedPost, RichText } from "@atproto/api";
import { BlueskyEmbed, PostNotAvailable } from "./BlueskyEmbed";
import { BlueskyPostEmpty } from "./BlueskyEmpty";
import { BlueskyTiny, CommentTiny } from "components/Icons";
import { BlueskyRichText } from "./BlueskyRichText";
import { Separator } from "components/Layout";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { useInitialPageLoad } from "components/InitialPageLoadProvider";

export const BlueskyPostBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let post = useEntity(props.entityID, "block/bluesky-post")?.data.value;

  useEffect(() => {
    if (props.preview) return;
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else input?.blur();
  }, [isSelected, props.entityID, props.preview]);

  let initialPageLoad = useInitialPageLoad();

  switch (true) {
    case !post:
      if (!permissions.write) return null;
      return (
        <label
          id={props.preview ? undefined : elementId.block(props.entityID).input}
          className={`
  	  w-full h-[104px] p-2
  	  text-tertiary hover:text-accent-contrast hover:cursor-pointer
  	  flex flex-auto gap-2 items-center justify-center hover:border-2 border-dashed rounded-lg
  	  ${isSelected ? "border-2 border-tertiary" : "border border-border"}
  	  ${props.pageType === "canvas" && "bg-bg-page"}`}
          onMouseDown={() => {
            focusBlock(
              { type: props.type, value: props.entityID, parent: props.parent },
              { type: "start" },
            );
          }}
        >
          <BlueskyPostEmpty {...props} />
        </label>
      );

    case AppBskyFeedDefs.isBlockedPost(post) ||
      AppBskyFeedDefs.isBlockedAuthor(post) ||
      AppBskyFeedDefs.isNotFoundPost(post):
      return (
        <div
          className={`w-full ${isSelected ? "block-border-selected" : "block-border"}`}
        >
          <PostNotAvailable />
        </div>
      );

    case AppBskyFeedDefs.isThreadViewPost(post):
      let record = post.post
        .record as AppBskyFeedDefs.FeedViewPost["post"]["record"];
      let facets = record.facets;

      // silliness to get the text and timestamp from the record with proper types
      let text: string | null = null;
      let timestamp: string | undefined = undefined;
      if (AppBskyFeedPost.isRecord(record)) {
        text = (record as AppBskyFeedPost.Record).text;
        timestamp = (record as AppBskyFeedPost.Record).createdAt;
      }

      //getting the url to the post
      let postId = post.post.uri.split("/")[4];
      let url = `https://bsky.app/profile/${post.post.author.handle}/post/${postId}`;

      let datetimeFormatted = initialPageLoad
        ? new Date(timestamp ? timestamp : "").toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })
        : "";

      return (
        <div
          className={`
      flex flex-col gap-2 relative w-full overflow-hidden group/blueskyPostBlock sm:p-3 p-2 text-sm text-secondary bg-bg-page
      ${isSelected ? "block-border-selected " : "block-border"}
      `}
        >
          {post.post.author && record && (
            <>
              <div className="bskyAuthor w-full flex items-center gap-2">
                <img
                  src={post.post.author?.avatar}
                  alt={`${post.post.author?.displayName}'s avatar`}
                  className="shink-0 w-8 h-8 rounded-full border border-border-light"
                />
                <div className="grow flex flex-col gap-0.5 leading-tight">
                  <div className=" font-bold text-secondary">
                    {post.post.author?.displayName}
                  </div>
                  <a
                    className="text-xs text-tertiary hover:underline"
                    target="_blank"
                    href={`https://bsky.app/profile/${post.post.author?.handle}`}
                  >
                    @{post.post.author?.handle}
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
                {post.post.embed && (
                  <BlueskyEmbed embed={post.post.embed} postUrl={url} />
                )}
              </div>
            </>
          )}
          <div className="w-full flex gap-2 items-center justify-between">
            <div className="text-xs text-tertiary">{datetimeFormatted}</div>
            <div className="flex gap-2 items-center">
              {post.post.replyCount && post.post.replyCount > 0 && (
                <>
                  <a
                    className="flex items-center gap-1 hover:no-underline"
                    target="_blank"
                    href={url}
                  >
                    {post.post.replyCount}
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
