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

export type PostsListReaderState = {
  search: string;
  tag: string | null;
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
  const tagCounts = useMemo(
    () => (controls.tagFilter ? tagCountsForIndex(index) : []),
    [controls.tagFilter, index],
  );

  return (
    <div
      className="postsListReaderControls flex flex-row gap-2 items-center w-full pb-3"
      // In the editor these sit inside a block; clicking them shouldn't
      // select the block underneath them.
      onMouseDown={(e) => e.stopPropagation()}
    >
      {controls.search && (
        <label className="input-with-border py-0! px-[6px]! grow min-w-0 flex items-center gap-1 text-secondary">
          <SearchSmall className="shrink-0 text-tertiary" />
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
      <div className="flex flex-row gap-2 items-center shrink-0 ml-auto">
        {controls.tagFilter && (
          <Popover
            asChild
            align="end"
            className="max-w-xs max-h-64 overflow-y-auto"
            trigger={
              <button
                type="button"
                aria-label={
                  state.tag ? `Filtering by tag: ${state.tag}` : "Filter by tag"
                }
                className={`shrink-0 flex items-center gap-1 ${
                  state.tag
                    ? "text-accent-contrast font-bold"
                    : "text-tertiary hover:text-accent-contrast"
                }`}
              >
                <TagSmall />
                {state.tag && (
                  <span className="text-sm max-w-24 truncate">{state.tag}</span>
                )}
              </button>
            }
          >
            {tagCounts.length === 0 ? (
              <div className="text-tertiary italic text-sm">no tags yet</div>
            ) : (
              <div className="flex flex-col gap-2 text-primary">
                {tagCounts.map(({ tag, count }) => (
                  <div key={tag} className="flex items-center gap-2">
                    <Tag
                      name={tag}
                      selected={state.tag === tag}
                      className="min-w-0"
                      onClick={() =>
                        setState({
                          ...state,
                          tag: state.tag === tag ? null : tag,
                        })
                      }
                    />
                    <div className="text-tertiary text-sm ml-auto">{count}</div>
                  </div>
                ))}
              </div>
            )}
          </Popover>
        )}
        {controls.sort && (
          <ToggleGroup<PostsListSort>
            className="shrink-0"
            value={state.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => setState({ ...state, sort })}
          />
        )}
      </div>
    </div>
  );
}
