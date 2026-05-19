import { forwardRef } from "react";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { PublicationPostsList } from "app/lish/[did]/[publication]/PublicationPostsList";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { ToggleGroup } from "components/ToggleGroup";
import { SettingsTiny } from "components/Icons/SettingsTiny";

type PostsListView = "compact" | "full";

export const PostsListBlock = (props: BlockProps & { preview?: boolean }) => {
  let isSelected = useUIState((s) =>
    !!s.selectedBlocks.find((b) => b.value === props.value),
  );

  if (props.preview) {
    return (
      <BlockLayout isSelected={isSelected} className="border-none!">
        <PostsListPlaceholder />
      </BlockLayout>
    );
  }

  return (
    <BlockLayout
      isSelected={isSelected}
      className="border-none!"
      extraOptions={<PostsListSettingsButton entityID={props.entityID} />}
    >
      <PostsListBlockContent entityID={props.entityID} />
    </BlockLayout>
  );
};

function PostsListBlockContent({ entityID }: { entityID: string }) {
  let { data } = usePublicationData();
  let publicationRecord = useNormalizedPublicationRecord();

  let viewFact = useEntity(entityID, "posts-list/view");
  let view: PostsListView = viewFact?.data.value ?? "full";

  let highlightFirstFact = useEntity(
    entityID,
    "posts-list/highlight-first-post",
  );
  let highlightFirst = highlightFirstFact?.data.value ?? false;

  if (data === undefined) return <PostsListPlaceholder />;
  if (!data?.publication) return <PostsListPlaceholder />;

  return (
    <PublicationPostsList
      publication={data.publication}
      publicationRecord={publicationRecord}
      posts={data.documents}
      view={view}
      highlightFirstPost={highlightFirst}
    />
  );
}

function PostsListPlaceholder() {
  return (
    <div className="publicationPostList w-full flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex w-full grow flex-col">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-2/3 bg-border-light rounded animate-pulse" />
            <div className="h-4 w-full bg-border-light rounded animate-pulse" />
          </div>
          <div className="pt-2">
            <div className="h-3 w-24 bg-border-light rounded animate-pulse" />
          </div>
          <hr className="last:hidden border-border-light mt-4" />
        </div>
      ))}
    </div>
  );
}

const SettingsTriggerButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <button
    {...props}
    ref={ref}
    onMouseDown={(e) => e.preventDefault()}
    aria-label="Posts List Settings"
    className="flex items-center"
  >
    <SettingsTiny />
  </button>
));
SettingsTriggerButton.displayName = "SettingsTriggerButton";

function PostsListSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();

  let viewFact = useEntity(props.entityID, "posts-list/view");
  let view: PostsListView = viewFact?.data.value ?? "full";

  let highlightFirstFact = useEntity(
    props.entityID,
    "posts-list/highlight-first-post",
  );
  let highlightFirst = highlightFirstFact?.data.value ?? false;

  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      trigger={<SettingsTriggerButton />}
    >
      <div className="flex flex-col gap-3 text-primary py-1 min-w-[220px]">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-sm">Post View</div>
          <ToggleGroup<PostsListView>
            fullWidth
            value={view}
            onChange={(value) => {
              if (!rep) return;
              rep.mutate.assertFact({
                entity: props.entityID,
                attribute: "posts-list/view",
                data: { type: "posts-list-view-union", value },
              });
            }}
            options={[
              { value: "compact", label: "Compact" },
              { value: "full", label: "Full" },
            ]}
          />
        </div>
        <Toggle
          toggle={highlightFirst}
          onToggle={() => {
            if (!rep) return;
            rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "posts-list/highlight-first-post",
              data: { type: "boolean", value: !highlightFirst },
            });
          }}
        >
          <div className="font-bold">Highlight First Post</div>
        </Toggle>
      </div>
    </Popover>
  );
}
