"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { SpeedyLink } from "components/SpeedyLink";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { PublicationPostsList } from "./PublicationPostsList";
import {
  PostsListReaderControlsBar,
  type PostsListReaderState,
} from "./PostsListReaderControls";
import type { PublicationPostsListPost } from "src/utils/buildPublicationPosts";
import {
  POSTS_LIST_PAGE_SIZE,
  readerControlledUris,
  type LoadPostsBatch,
  type PostsListIndexEntry,
  type PostsListReaderControls,
} from "src/utils/postsListPagination";

const DEFAULT_READER_STATE: PostsListReaderState = {
  search: "",
  tags: [],
  sort: "latest",
};

export function PaginatedPublicationPostsList({
  publication,
  publicationRecord,
  listId,
  uris,
  initialPosts,
  loadBatch,
  view = "medium",
  highlightFirstPost = false,
  limit,
  readerControls,
  readerIndex,
  emptyState,
  className,
  disableLinks = false,
  pageWidth,
}: {
  publication: { uri: string; record: unknown };
  publicationRecord: NormalizedPublication | null;
  listId: string;
  uris: string[];
  initialPosts: PublicationPostsListPost[];
  loadBatch: LoadPostsBatch;
  view?: "small" | "medium";
  highlightFirstPost?: boolean;
  limit?: number;
  readerControls?: PostsListReaderControls;
  readerIndex?: PostsListIndexEntry[];
  emptyState?: React.ReactNode;
  className?: string;
  disableLinks?: boolean;
  pageWidth?: number;
}) {
  const [readerState, setReaderState] =
    useState<PostsListReaderState>(DEFAULT_READER_STATE);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useDebouncedEffect(() => setDebouncedSearch(readerState.search), 200, [
    readerState.search,
  ]);
  const searchEnabled = !!readerControls?.search;
  const tagFilterEnabled = !!readerControls?.tagFilter;
  const sortEnabled = !!readerControls?.sort;
  // this filters the posts according to reader options
  const orderedUris = useMemo(() => {
    if (!readerIndex || !(searchEnabled || tagFilterEnabled || sortEnabled))
      return uris;

    return readerControlledUris(readerIndex, {
      search: searchEnabled ? debouncedSearch : "",
      tags: tagFilterEnabled ? readerState.tags : null,
      sort: sortEnabled ? readerState.sort : "latest",
    });
  }, [
    uris,
    readerIndex,
    searchEnabled,
    tagFilterEnabled,
    sortEnabled,
    debouncedSearch,
    readerState.tags,
    readerState.sort,
  ]);

  const cappedUris =
    limit && limit > 0 ? orderedUris.slice(0, limit) : orderedUris;
  const cappedInitialPosts =
    limit && limit > 0 ? initialPosts.slice(0, limit) : initialPosts;

  const seedMatches =
    cappedInitialPosts.length > 0 &&
    cappedInitialPosts.every((p, i) => p.uri === cappedUris[i]);

  const getKey = (pageIndex: number) => {
    const start = pageIndex * POSTS_LIST_PAGE_SIZE;
    const slice = cappedUris.slice(start, start + POSTS_LIST_PAGE_SIZE);
    if (slice.length === 0) return null;
    return ["posts-batch", listId, slice] as const;
  };

  const { data, size, setSize, isValidating, isLoading } = useSWRInfinite(
    getKey,
    ([, , slice]) => loadBatch(slice),
    {
      fallbackData: seedMatches ? [cappedInitialPosts] : undefined,
      revalidateFirstPage: false,
      keepPreviousData: true,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasMore = cappedUris.length > size * POSTS_LIST_PAGE_SIZE;
  // `data` gains a page only once the whole array resolves, so a size that has
  // outrun it means a batch is in flight. `isValidating` alone also fires for
  // focus revalidation, and `hasMore` describes the page *after* the one being
  // loaded — it goes false on the final batch, the one readers wait on.
  const isLoadingMore = isValidating && size > (data?.length ?? 0);
  const hasUnshownPosts = hasMore || cappedUris.length < orderedUris.length;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating && hasMore) {
          setSize(size + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [size, setSize, isValidating, hasMore]);

  if (uris.length === 0) return <>{emptyState}</>;

  const allPosts = data ? data.flatMap((page) => page) : [];

  return (
    <div className={`relative w-full ${className ?? ""}`}>
      {/*{readerControls && readerIndex && (

        <PostsListReaderControlsBar
          controls={readerControls}
          index={readerIndex}
          state={readerState}
          setState={setReaderState}
        />
      )}*/}

      {readerIndex && (
        <PostsListReaderControlsBar
          controls={{
            search: true,
            tagFilter: true,
            sort: true,
          }}
          index={readerIndex}
          state={readerState}
          setState={setReaderState}
        />
      )}
      {cappedUris.length === 0 ? (
        <div className="text-center text-tertiary italic py-4">
          No posts match
        </div>
      ) : (
        <>
          <div
            className={isLoading ? "opacity-50 transition-opacity" : ""}
            aria-busy={isLoading || undefined}
          >
            <PublicationPostsList
              publication={publication}
              publicationRecord={publicationRecord}
              posts={allPosts}
              view={view}
              highlightFirstPost={highlightFirstPost}
              preSorted
              disableLinks={disableLinks}
              pageWidth={pageWidth}
            />
          </div>
          {/* Fires the next batch while still ~1200px from the list's end. */}
          <div
            ref={loadMoreRef}
            className="absolute bottom-[1200px] left-0 w-full h-px pointer-events-none"
            aria-hidden="true"
          />
          {isLoadingMore && (
            <div className="text-center text-tertiary py-4">
              Loading more posts...
            </div>
          )}
        </>
      )}
      {/* In the SSR HTML whenever posts are missing from it: only the first
          batch is served, so crawlers need a plain anchor to the archive to
          reach the rest. */}
      {!disableLinks && hasUnshownPosts && (
        <div className="text-center pt-3">
          <SpeedyLink
            href={`${getPublicationURL(publication).replace(/\/+$/, "")}/archive`}
            className="text-sm text-tertiary hover:text-accent-contrast"
          >
            View all posts
          </SpeedyLink>
        </div>
      )}
    </div>
  );
}
