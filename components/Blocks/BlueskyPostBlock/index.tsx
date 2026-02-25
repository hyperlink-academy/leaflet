import { useEntitySetContext } from "components/EntitySetProvider";
import { useEffect } from "react";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps, BlockLayout } from "../Block";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";
import { AppBskyFeedDefs } from "@atproto/api";
import { PostNotAvailable } from "./BlueskyEmbed";
import { BlueskyPostEmpty } from "./BlueskyEmpty";

import { BskyPostContent } from "app/lish/[did]/[publication]/[rkey]/BskyPostContent";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

export const BlueskyPostBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let post = useEntity(props.entityID, "block/bluesky-post")?.data.value;
  let clientHost = useEntity(props.entityID, "bluesky-post/host")?.data.value;

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
      let postView = post.post as PostView;

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
            clientHost={clientHost}
          />
        </BlockLayout>
      );
  }
};
