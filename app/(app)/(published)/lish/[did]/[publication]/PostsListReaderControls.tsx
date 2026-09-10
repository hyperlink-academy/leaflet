"use client";

import { useMemo } from "react";
import { Input } from "components/Input";
import { Popover } from "components/Popover";
import { Tag } from "components/Tags";
import { ToggleGroup } from "components/ToggleGroup";
import { CloseTiny } from "components/Icons/CloseTiny";
import { SearchSmall } from "components/Icons/SearchSmall";
import { TagSmall } from "components/Icons/TagSmall";
import {
  tagCountsForIndex,
  type PostsListIndexEntry,
  type PostsListReaderControls,
  type PostsListSort,
} from "src/utils/postsListPagination";
import { SearchTiny } from "components/Icons/SearchTiny";

export type PostsListReaderState = {
  search: string;
  tags: string[];
  sort: PostsListSort;
};

const SORT_OPTIONS: { value: PostsListSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "top", label: "Top" },
];

export function PostsListReaderControlsBar({
  controls,
  index,
  state,
  setState,
}: {
  controls: PostsListReaderControls;
  // The block's full post index. Tag counts describe the whole list, not the
  // current search — so the dropdown doesn't reshuffle as you type.
  index: PostsListIndexEntry[];
  state: PostsListReaderState;
  setState: (next: PostsListReaderState) => void;
}) {
  return (
    <div
      className="postsListReaderControls flex flex-row items-center gap-6 w-full pb-2"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {controls.search && (
        <label className="readerSearch border border-transparent focus-within:border-border rounded-lg py-0! px-0 focus-within:px-[6px]! transition-[padding] duration-100 ease-out grow min-w-0 flex items-center gap-2 text-secondary">
          <SearchTiny className="shrink-0 text-tertiary" />
          <Input
            className="appearance-none! bg-transparent grow min-w-0 py-1! outline-none! text-primary"
            placeholder="Search posts…"
            value={state.search}
            autoComplete="off"
            // The editor's block keyboard shortcuts (backspace deletes the
            // block) listen on window and only bail for non-empty inputs.
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => setState({ ...state, search: e.target.value })}
          />
          {state.search && (
            <button
              type="button"
              aria-label="Clear search"
              className="shrink-0 text-tertiary hover:text-accent-contrast"
              onClick={() => setState({ ...state, search: "" })}
            >
              <CloseTiny />
            </button>
          )}
        </label>
      )}

      <div
        className={`readerFilterAndSort gap-3 items-center ${!controls.tagFilter && !controls.sort ? "hidden" : "flex"} ${controls.tagFilter && controls.sort && controls.search ? " flex-row" : "flex-row-reverse"} `}
      >
        {controls.tagFilter && (
          <TagSelector
            index={index}
            tags={state.tags}
            setTags={(tags) => setState({ ...state, tags })}
          />
        )}

        {controls.sort && (
          <ToggleGroup<PostsListSort>
            background="light"
            className="readerSort shrink-0"
            value={state.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => setState({ ...state, sort })}
          />
        )}
      </div>
    </div>
  );
}

const TagSelector = ({
  index,
  tags,
  setTags,
}: {
  index: PostsListIndexEntry[];
  tags: string[];
  setTags: (next: string[]) => void;
}) => {
  const tagCounts = useMemo(() => tagCountsForIndex(index), [index]);

  return (
    <Popover
      asChild
      align="end"
      className="readerTagFilter max-w-xs max-h-64 overflow-y-auto"
      trigger={
        <button
          type="button"
          aria-label={
            tags.length
              ? `Filtering by tags: ${tags.join(", ")}`
              : "Filter by tag"
          }
          className={`shrink-0 flex items-center gap-1 ${
            tags.length
              ? "text-accent-contrast font-bold"
              : "text-tertiary hover:text-accent-contrast"
          }`}
        >
          <TagSmall />
          {tags.length > 0 && <span className="text-sm ">{tags.length}</span>}
        </button>
      }
    >
      {tagCounts.length === 0 ? (
        <div className="text-tertiary italic text-sm">no tags yet</div>
      ) : (
        <div className="flex flex-wrap gap-2 text-primary">
          {tagCounts.map(({ tag, count }) => {
            let selected = tags.includes(tag);
            return (
              <Tag
                key={tag}
                name={tag}
                selected={selected}
                count={count}
                onClick={() =>
                  setTags(
                    selected ? tags.filter((t) => t !== tag) : [...tags, tag],
                  )
                }
              />
            );
          })}
        </div>
      )}
    </Popover>
  );
};
