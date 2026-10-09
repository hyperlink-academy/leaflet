import { useEntitySetContext } from "components/EntitySetProvider";
import { useEffect } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { BlockProps, BlockLayout } from "../Block";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";
import { AppBskyFeedDefs } from "@atproto/api";
import { PostNotAvailable } from "./BlueskyEmbed";
import { BlueskyPostEmpty } from "./BlueskyEmpty";

import {
  BskyPostContent,
  BskyPostMediaContent,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/BskyPostContent";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { BlockSettings } from "../SettingsTriggerButton";
import { DrawerThreadPageProvider } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
import { useHostPostFrame } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postFrame";
import { BlockSettingOptions } from "../BlockSettingOptions";
import { PlaceholderText } from "../PostSizeIcons";
import {
  getBskyPostMedia,
  resolveBskyPostView,
  type BskyPostView,
} from "src/utils/bskyPostView";

export const BlueskyPostBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let isSelected = useIsBlockSelected(props.entityID);
  let post = useEntity(props.entityID, "block/bluesky-post")?.data.value;
  let clientHost = useEntity(props.entityID, "bluesky-post/host")?.data.value;
  let viewFact = useEntity(props.entityID, "bluesky-post/view");
  let hasDrawer = !!useHostPostFrame() && !props.preview;

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
              {
                type: props.type,
                entityID: props.entityID,
                parent: props.parent,
              },
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
      let resolved = resolveBskyPostView(postView, viewFact?.data.value);

      let content =
        resolved.view === "media" ? (
          <BskyPostMediaContent
            post={postView}
            media={resolved.media}
            parent={undefined}
            className="text-sm text-secondary"
            clientHost={clientHost}
            openThreadOnClick={false}
            replyEnabled={hasDrawer}
            quoteEnabled={hasDrawer}
          />
        ) : (
          <BskyPostContent
            post={postView}
            parent={undefined}
            showBlueskyLink={true}
            showEmbed={true}
            avatarSize="large"
            className="text-sm text-secondary  "
            clientHost={clientHost}
            openThreadOnClick={false}
            replyEnabled={hasDrawer}
            quoteEnabled={hasDrawer}
          />
        );

      return (
        <BlockLayout
          isSelected={!!isSelected}
          hasBackground="page"
          borderOnHover
          className="blueskyPostBlock sm:px-3! sm:py-2! px-2! py-1!"
          extraOptions={
            !props.preview &&
            getBskyPostMedia(postView) && (
              <BlueskyPostSettingsButton
                entityID={props.entityID}
                view={resolved.view}
              />
            )
          }
        >
          {hasDrawer ? (
            <DrawerThreadPageProvider>{content}</DrawerThreadPageProvider>
          ) : (
            content
          )}
        </BlockLayout>
      );
  }
};

function BlueskyPostSettingsButton(props: {
  entityID: string;
  view: BskyPostView;
}) {
  let { rep } = useReplicache();
  return (
    <BlockSettings label="Bluesky Post" className="w-sm">
      <h4>Post Style</h4>
      <BlockSettingOptions<BskyPostView>
        options={[
          { value: "full", Icon: FullPostIcon },
          { value: "media", Icon: MediaOnlyIcon },
        ]}
        value={props.view}
        onSelect={(value) => {
          if (!rep) return;
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "bluesky-post/view",
            data: { type: "bluesky-post-view-union", value },
          });
        }}
      />
    </BlockSettings>
  );
}

const MediaPlaceholder = () => (
  <div
    className="w-full h-[36px] bg-border rounded-[2px] bg-cover bg-center"
    style={{
      backgroundImage: "url(/imagePlaceholder.png)",
      backgroundBlendMode: "hard-light",
    }}
  />
);

const FullPostIcon = ({ selected }: { selected: boolean }) => (
  <div
    className={`flex gap-1.5 p-2 w-full overflow-hidden opaque-container border-tertiary! ${selected ? "border-accent-contrast!" : ""}`}
  >
    <div className="w-3 h-3 rounded-full bg-border shrink-0" />
    <div className="flex flex-col gap-1 grow min-w-0">
      {PlaceholderText("sm", "50%")}
      {PlaceholderText("md")}
      <MediaPlaceholder />
    </div>
  </div>
);

const MediaOnlyIcon = ({ selected }: { selected: boolean }) => (
  <div
    className={`flex flex-col gap-1 p-2 w-full overflow-hidden opaque-container border-tertiary! ${selected ? "border-accent-contrast!" : ""}`}
  >
    <MediaPlaceholder />
    {PlaceholderText("sm", "30%")}
  </div>
);
