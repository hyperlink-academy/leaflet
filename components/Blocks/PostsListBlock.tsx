import { useMemo, useState } from "react";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "app/(app)/lish/[did]/[publication]/dashboard/PublicationSWRProvider";
import { PaginatedPublicationPostsList } from "app/(app)/lish/[did]/[publication]/PaginatedPublicationPostsList";
import {
  POSTS_LIST_PAGE_SIZE,
  postsListFilterKey,
  sortPostsForList,
  filterPostsByTags,
  type LoadPostsBatch,
} from "app/(app)/lish/[did]/[publication]/postsListPagination";
import type { PublicationPostsListPost } from "app/(app)/lish/[did]/[publication]/buildPublicationPosts";
import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { SettingsTriggerButton } from "./SettingsTriggerButton";
import { PlaceholderText } from "./PostSizeIcons";
import { CloseTiny } from "components/Icons/CloseTiny";
import { EmptyState } from "components/EmptyState";

type PostsListView = "small" | "medium";

export const PostsListBlock = (props: BlockProps & { preview?: boolean }) => {
  let isSelected = useUIState(
    (s) => !!s.selectedBlocks.find((b) => b.value === props.value),
  );

  if (props.preview) {
    return (
      <BlockLayout
        isSelected={isSelected}
        className="border-none! rounded-none!"
      >
        <PostsListPlaceholder />
      </BlockLayout>
    );
  }

  return (
    <BlockLayout
      isSelected={isSelected}
      className="border-none! p-0! rounded-none!"
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
  let view: PostsListView = viewFact?.data.value ?? "medium";

  let highlightFirstFact = useEntity(
    entityID,
    "posts-list/highlight-first-post",
  );
  let highlightFirst = highlightFirstFact?.data.value ?? false;

  let filterTagFacts = useEntity(entityID, "posts-list/filter-tag");
  let filterTags = useMemo(
    () => filterTagFacts.map((f) => f.data.value),
    [filterTagFacts],
  );

  let limitFact = useEntity(entityID, "posts-list/limit");
  let limit = limitFact?.data.value;

  // The dashboard already loads every document, so order/filter that in-memory
  // set, hand the paginated list the full URI ordering, and resolve each batch
  // locally — no extra round trips, just windowed rendering.
  let listData = useMemo(() => {
    if (!data?.documents) return null;
    let posts: PublicationPostsListPost[] = sortPostsForList(
      filterPostsByTags(data.documents, filterTags),
    ).map((d) => ({
      uri: d.uri,
      record: d.record,
      commentsCount: d.commentsCount,
      mentionsCount: d.mentionsCount,
      recommendsCount: d.recommendsCount,
      membersOnly: d.membersOnly,
    }));
    let byUri = new Map(posts.map((p) => [p.uri, p]));
    let loadBatch: LoadPostsBatch = async (batch) =>
      batch
        .map((u) => byUri.get(u))
        .filter((p): p is PublicationPostsListPost => p !== undefined);
    return {
      uris: posts.map((p) => p.uri),
      initialPosts: posts.slice(0, POSTS_LIST_PAGE_SIZE),
      loadBatch,
    };
  }, [data?.documents, filterTags]);

  if (data === undefined) return <PostsListPlaceholder />;
  if (!data?.publication) return <PostsListPlaceholder />;

  if (!listData || listData.uris.length === 0)
    return (
      <EmptyState container="none">
        You haven't published any posts yet! When you do, they'll show here.
      </EmptyState>
    );

  return (
    <PaginatedPublicationPostsList
      publication={data.publication}
      publicationRecord={publicationRecord}
      listId={`${data.publication.uri}:${postsListFilterKey(filterTags)}`}
      uris={listData.uris}
      initialPosts={listData.initialPosts}
      loadBatch={listData.loadBatch}
      view={view}
      highlightFirstPost={highlightFirst}
      limit={limit}
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
  let { rep, undoManager } = useReplicache();
  let { data } = usePublicationData();

  let viewFact = useEntity(props.entityID, "posts-list/view");
  let view: PostsListView = viewFact?.data.value ?? "medium";

  let highlightFirstFact = useEntity(
    props.entityID,
    "posts-list/highlight-first-post",
  );
  let highlightFirst = highlightFirstFact?.data.value ?? false;

  let filterTagFacts = useEntity(props.entityID, "posts-list/filter-tag");
  let selectedTags = useMemo(
    () => filterTagFacts.map((f) => f.data.value),
    [filterTagFacts],
  );

  let limitFact = useEntity(props.entityID, "posts-list/limit");
  let limit = limitFact?.data.value;

  let [filterByTagEnabled, setFilterByTagEnabled] = useState(
    () => selectedTags.length > 0,
  );
  let [limitEnabled, setLimitEnabled] = useState(() => !!limit && limit > 0);

  let setLimit = (value: number) => {
    if (!rep) return;
    rep.mutate.assertFact({
      entity: props.entityID,
      attribute: "posts-list/limit",
      data: { type: "number", value },
    });
  };
  let clearLimit = () => {
    if (!rep || !limitFact) return;
    rep.mutate.retractFact({ factID: limitFact.id });
  };

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
      className="w-md"
      trigger={<SettingsTriggerButton aria-label="Posts List Settings" />}
    >
      <div className="flex flex-col gap-3 text-primary py-1 min-w-[220px]">
        <div className="flex flex-col gap-2">
          <div>
            <h3>List Layout</h3>
          </div>
          <div className="flex sm:flex-row flex-col sm:gap-1 gap-2 w-full items-stretch">
            {(
              [
                { value: "small", Icon: SmallIcon },
                { value: "medium", Icon: MedIcon },
              ] as {
                value: PostsListView;
                Icon: (props: { selected: boolean }) => React.ReactNode;
              }[]
            ).map((option) => {
              let selected =
                view === option.value ||
                (option.value === "medium" && view !== "small");
              return (
                <button
                  className={`PostBlockSizeSettingOption text-left flex flex-col flex-1 pt-1 p-2 outline-2 outline-offset-1 border ${selected ? "accent-container outline-accent-contrast border-accent-contrast " : "opaque-container outline-transparent"}`}
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!rep) return;
                    rep.mutate.assertFact({
                      entity: props.entityID,
                      attribute: "posts-list/view",
                      data: {
                        type: "posts-list-view-union",
                        value: option.value,
                      },
                    });
                  }}
                >
                  <div className="text-xs font-bold text-secondary uppercase pb-1">
                    {option.value}
                  </div>
                  <div className="flex items-center grow w-full ">
                    <option.Icon selected={selected} />
                  </div>
                </button>
              );
            })}
          </div>
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
          <strong>Highlight First Post</strong>
        </Toggle>
        <div className="flex flex-col gap-1">
          <Toggle
            toggle={limitEnabled}
            onToggle={() => {
              if (limitEnabled) {
                clearLimit();
                setLimitEnabled(false);
              } else {
                setLimitEnabled(true);
                if (!limit || limit < 1) setLimit(5);
              }
            }}
          >
            <strong>Limit Posts</strong>
          </Toggle>
          {limitEnabled && (
            <div className="flex items-center gap-2 ml-8 text-secondary text-sm">
              <span>Show only</span>
              <input
                type="number"
                min={1}
                value={limit ?? 5}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  let next = Math.max(1, Math.floor(Number(e.target.value)));
                  if (Number.isFinite(next)) setLimit(next);
                }}
                className="input-tag w-16 border border-border rounded px-1 py-0.5 bg-bg-page"
              />
              <span>posts</span>
            </div>
          )}
        </div>
        <hr className="border-border-light my-1" />

        <div className="flex flex-col gap-2">
          <h3>Settings</h3>
          <div className="tagFilter flex flex-col gap-1 ">
            <div className="flex flex-row items-baseline justify-between gap-4">
              <Toggle
                toggle={filterByTagEnabled}
                onToggle={() => {
                  if (filterByTagEnabled) {
                    // turning off the filter clears any selected tags
                    undoManager.withUndoGroup(async () => {
                      if (!rep) return;
                      for (let fact of filterTagFacts)
                        await rep.mutate.retractFact({ factID: fact.id });
                    });
                    setFilterByTagEnabled(false);
                  } else {
                    setFilterByTagEnabled(true);
                  }
                }}
              >
                <strong>Filter by Tag</strong>
              </Toggle>
              {filterByTagEnabled && selectedTags.length > 0 && (
                <button
                  type="button"
                  className="text-tertiary hover:text-accent-contrast text-sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    undoManager.withUndoGroup(async () => {
                      if (!rep) return;
                      for (let fact of filterTagFacts)
                        await rep.mutate.retractFact({ factID: fact.id });
                    })
                  }
                >
                  clear
                </button>
              )}
            </div>
            {filterByTagEnabled ? (
              <div className="tagList light-container p-2 ml-8">
                {allTags.length === 0 ? (
                  <div className="text-tertiary italic text-sm">
                    no tags yet
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      let selectedFact = filterTagFacts.find(
                        (f) => f.data.value === tag,
                      );
                      let isSelected = !!selectedFact;
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={isSelected}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (!rep) return;
                            if (selectedFact) {
                              rep.mutate.retractFact({
                                factID: selectedFact.id,
                              });
                            } else {
                              rep.mutate.assertFact({
                                entity: props.entityID,
                                attribute: "posts-list/filter-tag",
                                data: { type: "string", value: tag },
                              });
                            }
                          }}
                          className={`tag flex items-center text-xs rounded-md border px-1 py-0.5 ${
                            isSelected
                              ? "bg-accent-1 border-accent-1 font-bold text-accent-2"
                              : "bg-bg-page border-border text-tertiary"
                          }`}
                        >
                          {tag}
                          {isSelected ? (
                            <CloseTiny className="scale-75 text-accent-2" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Popover>
  );
}

const SmallIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col w-full overflow-hidden opaque-container border-tertiary! divide-y divide-border-light ${selected && "border-accent-contrast!"}`}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1 p-2">
          {PlaceholderText("lg")}
          <div className="flex justify-between mt-1 w-full">
            {PlaceholderText("sm", "60%")}
          </div>
        </div>
      ))}
    </div>
  );
};

const MedIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col w-full overflow-hidden opaque-container border-tertiary! divide-y divide-border-light ${selected && "border-accent-contrast!"}`}
    >
      {[0, 1].map((i) => (
        <div key={i} className="flex w-full">
          <div className="flex flex-col gap-1 p-2 grow min-w-0">
            {PlaceholderText("lg")}
            {PlaceholderText("md")}
            {PlaceholderText("md", "80%")}
            <div className="flex justify-between mt-2 w-full">
              {PlaceholderText("sm", "60%")}
            </div>
          </div>
          <div
            className="aspect-square h-[68px] bg-border border-l border-border shrink-0 bg-cover bg-center"
            style={{
              backgroundImage: "url(/imagePlaceholder.png)",
              backgroundBlendMode: "hard-light",
            }}
          />
        </div>
      ))}
    </div>
  );
};
