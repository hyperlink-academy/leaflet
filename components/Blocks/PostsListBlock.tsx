import { useMemo } from "react";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/(app)/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { PublicationPostsList } from "app/(app)/lish/[did]/[publication]/PublicationPostsList";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { ToggleGroup } from "components/ToggleGroup";
import { SettingsTriggerButton } from "./SettingsTriggerButton";

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

  let filterTagFact = useEntity(entityID, "posts-list/filter-tag");
  let filterTag = filterTagFact?.data.value;

  let filteredPosts = useMemo(() => {
    if (!data?.documents) return data?.documents;
    if (!filterTag) return data.documents;
    return data.documents.filter((d) => d.record.tags?.includes(filterTag));
  }, [data?.documents, filterTag]);

  if (data === undefined) return <PostsListPlaceholder />;
  if (!data?.publication) return <PostsListPlaceholder />;

  return (
    <PublicationPostsList
      publication={data.publication}
      publicationRecord={publicationRecord}
      posts={filteredPosts}
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

function PostsListSettingsButton(props: { entityID: string }) {
  let { rep } = useReplicache();
  let { data } = usePublicationData();

  let viewFact = useEntity(props.entityID, "posts-list/view");
  let view: PostsListView = viewFact?.data.value ?? "full";

  let highlightFirstFact = useEntity(
    props.entityID,
    "posts-list/highlight-first-post",
  );
  let highlightFirst = highlightFirstFact?.data.value ?? false;

  let filterTagFact = useEntity(props.entityID, "posts-list/filter-tag");
  let filterTag = filterTagFact?.data.value;

  let allTags = useMemo(() => {
    let tagSet = new Set<string>();
    for (let doc of data?.documents ?? []) {
      for (let tag of doc.record.tags ?? []) tagSet.add(tag);
    }
    return Array.from(tagSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [data?.documents]);

  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      trigger={<SettingsTriggerButton aria-label="Posts List Settings" />}
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
        <div className="flex flex-col gap-1">
          <div className="font-bold text-sm">Filter by Tag</div>
          {allTags.length === 0 ? (
            <div className="text-tertiary italic text-sm">no tags yet</div>
          ) : (
            <div className="flex flex-col max-h-40 overflow-y-auto border border-border-light rounded-md">
              {allTags.map((tag) => {
                let isSelected = filterTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!rep) return;
                      if (isSelected) {
                        if (filterTagFact)
                          rep.mutate.retractFact({
                            factID: filterTagFact.id,
                          });
                      } else {
                        rep.mutate.assertFact({
                          entity: props.entityID,
                          attribute: "posts-list/filter-tag",
                          data: { type: "string", value: tag },
                        });
                      }
                    }}
                    className={`text-left px-2 py-1 text-sm hover:bg-border-light ${
                      isSelected ? "bg-accent-1 text-accent-2 font-bold" : ""
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Popover>
  );
}
