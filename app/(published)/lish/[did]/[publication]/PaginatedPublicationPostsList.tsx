"use client";

import React, { useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { PublicationPostsList } from "./PublicationPostsList";
import type { PublicationPostsListPost } from "./buildPublicationPosts";
import {
  POSTS_LIST_PAGE_SIZE,
  type LoadPostsBatch,
} from "./postsListPagination";

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
  emptyState,
  className,
}: {
  publication: { uri: string; record: unknown };
  publicationRecord: NormalizedPublication | null;
  // Distinguishes this list's SWR cache from other posts-list blocks on the
  // page (e.g. publication uri + tag-filter signature).
  listId: string;
  // The full, pre-ordered list of post URIs. Pagination just walks it in
  // POSTS_LIST_PAGE_SIZE windows.
  uris: string[];
  // First window, already hydrated (SSR HTML / editor's in-memory data) so it
  // renders without a round trip.
  initialPosts: PublicationPostsListPost[];
  loadBatch: LoadPostsBatch;
  view?: "small" | "medium";
  highlightFirstPost?: boolean;
  // Cap the number of posts shown; pagination stops once the list reaches it.
  limit?: number;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  // A limit caps the list at its source so windowing and load-on-scroll both
  // respect it without any special-casing downstream.
  const cappedUris = limit && limit > 0 ? uris.slice(0, limit) : uris;
  const cappedInitialPosts =
    limit && limit > 0 ? initialPosts.slice(0, limit) : initialPosts;

  const getKey = (pageIndex: number) => {
    const start = pageIndex * POSTS_LIST_PAGE_SIZE;
    const slice = cappedUris.slice(start, start + POSTS_LIST_PAGE_SIZE);
    if (slice.length === 0) return null;
    return ["posts-batch", listId, slice] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([, , slice]) => loadBatch(slice),
    {
      fallbackData: [cappedInitialPosts],
      revalidateFirstPage: false,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasMore = cappedUris.length > size * POSTS_LIST_PAGE_SIZE;
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
      <PublicationPostsList
        publication={publication}
        publicationRecord={publicationRecord}
        posts={allPosts}
        view={view}
        highlightFirstPost={highlightFirstPost}
        preSorted
      />
      {/* Fires the next batch while still ~1200px from the list's end. */}
      <div
        ref={loadMoreRef}
        className="absolute bottom-[1200px] left-0 w-full h-px pointer-events-none"
        aria-hidden="true"
      />
      {isValidating && hasMore && (
        <div className="text-center text-tertiary py-4">
          Loading more posts...
        </div>
      )}
    </div>
  );
}
