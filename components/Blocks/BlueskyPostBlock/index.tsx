import { useEntitySetContext } from "components/EntitySetProvider";
import { useEffect, useState } from "react";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps, BlockLayout } from "../Block";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";
import { AppBskyFeedDefs, AppBskyFeedPost, RichText } from "@atproto/api";
import { BlueskyEmbed, PostNotAvailable } from "./BlueskyEmbed";
import { BlueskyPostEmpty } from "./BlueskyEmpty";
import { BlueskyRichText } from "./BlueskyRichText";
import { Separator } from "components/Layout";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { BskyPostContent } from "app/lish/[did]/[publication]/[rkey]/BskyPostContent";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

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
        <BlockLayout isSelected={!!isSelected} className="w-full">
          <PostNotAvailable />
        </BlockLayout>
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
      let postView = post.post as PostView;
      let url = `https://bsky.app/profile/${post.post.author.handle}/post/${postId}`;

      return (
        <BlockLayout
          isSelected={!!isSelected}
          hasBackground="page"
          borderOnHover
          className="blueskyPostBlock sm:px-3! sm:py-2! px-2! py-1!"
        >
          <BskyPostContent
            post={postView}
            parent={undefined}
            showBlueskyLink={true}
            showEmbed={true}
            avatarSize="large"
            className="text-sm text-secondary  "
          />
        </BlockLayout>
      );
  }
};

function PostDate(props: { timestamp: string }) {
  const formattedDate = useLocalizedDate(props.timestamp, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  return <div className="text-xs text-tertiary">{formattedDate}</div>;
}
