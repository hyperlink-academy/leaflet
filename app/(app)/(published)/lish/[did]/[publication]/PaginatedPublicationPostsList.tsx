"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { useDebouncedValue } from "src/hooks/useDebouncedValue";
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

const RETRY_DELAY_MS = 2000;

export function PaginatedPublicationPostsList({
  publication,
  publicationRecord,
  uris,
  index,
  knownPosts,
  loadBatch,
  view = "medium",
  highlightFirstPost = false,
  limit,
  readerControls,
  emptyState,
  className,
  disableLinks = false,
  pageWidth,
}: {
  publication: { uri: string; record: unknown };
  publicationRecord: NormalizedPublication | null;
  uris?: string[];
  index?: PostsListIndexEntry[];
  knownPosts: PublicationPostsListPost[];
  loadBatch?: LoadPostsBatch;
  view?: "small" | "medium";
  highlightFirstPost?: boolean;
  limit?: number;
  readerControls?: PostsListReaderControls;
  emptyState?: React.ReactNode;
  className?: string;
  disableLinks?: boolean;
  pageWidth?: number;
}) {
  const [readerState, setReaderState] =
    useState<PostsListReaderState>(DEFAULT_READER_STATE);
  const search = useDebouncedValue(readerState.search, 200);
  const searchEnabled = !!readerControls?.search;
  const tagFilterEnabled = !!readerControls?.tagFilter;
  const sortEnabled = !!readerControls?.sort;
  const orderedUris = useMemo(() => {
    if (!index) return uris ?? [];
    return readerControlledUris(index, {
      search: searchEnabled ? search : "",
      tags: tagFilterEnabled ? readerState.tags : null,
      sort: sortEnabled ? readerState.sort : "latest",
    });
  }, [
    uris,
    index,
    searchEnabled,
    tagFilterEnabled,
    sortEnabled,
    search,
    readerState.tags,
    readerState.sort,
  ]);
  const cappedUris =
    limit && limit > 0 ? orderedUris.slice(0, limit) : orderedUris;

  const filterKey = `${search}\n${readerState.tags.join(",")}\n${readerState.sort}`;
  const [shown, setShown] = useState({ filterKey, pages: 1 });
  const pages = shown.filterKey === filterKey ? shown.pages : 1;
  const visibleUris = cappedUris.slice(0, pages * POSTS_LIST_PAGE_SIZE);
  const hasMore = cappedUris.length > visibleUris.length;

  const known = useMemo(
    () => new Map(knownPosts.map((p) => [p.uri, p])),
    [knownPosts],
  );
  const [fetched, setFetched] = useState(
    () => new Map<string, PublicationPostsListPost | null>(),
  );
  const postFor = (uri: string) =>
    known.get(uri) ?? (loadBatch ? fetched.get(uri) : null);

  const posts: PublicationPostsListPost[] = [];
  const pendingUris: string[] = [];
  for (const uri of visibleUris) {
    const post = postFor(uri);
    if (post === undefined) pendingUris.push(uri);
    else if (post && pendingUris.length === 0) posts.push(post);
  }
  const isHydrating = pendingUris.length > 0;

  const inflight = useRef(new Set<string>());
  const [retry, setRetry] = useState(0);
  const pendingKey = pendingUris.join(" ");
  useEffect(() => {
    if (!loadBatch || !pendingKey) return;
    const batch = pendingKey
      .split(" ")
      .filter((uri) => !inflight.current.has(uri))
      .slice(0, POSTS_LIST_PAGE_SIZE);
    if (batch.length === 0) return;
    for (const uri of batch) inflight.current.add(uri);
    loadBatch(batch)
      .then((result) => {
        setFetched((prev) => {
          const next = new Map(prev);
          for (const uri of batch)
            next.set(uri, result.find((p) => p.uri === uri) ?? null);
          return next;
        });
      })
      .catch(() => {
        setTimeout(() => setRetry((r) => r + 1), RETRY_DELAY_MS);
      })
      .finally(() => {
        for (const uri of batch) inflight.current.delete(uri);
      });
  }, [loadBatch, pendingKey, retry]);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || isHydrating) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShown({ filterKey, pages: pages + 1 });
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isHydrating, filterKey, pages]);

  if ((index ?? uris ?? []).length === 0) return <>{emptyState}</>;

  return (
    <div className={`relative w-full py-2 ${className ?? ""}`}>
      {readerControls && index && (
        <PostsListReaderControlsBar
          controls={readerControls}
          index={index}
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
          <div aria-busy={isHydrating || undefined}>
            <PublicationPostsList
              publication={publication}
              publicationRecord={publicationRecord}
              posts={posts}
              view={view}
              highlightFirstPost={highlightFirstPost}
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
          {isHydrating && (
            <div className="text-center text-tertiary py-4">
              Loading more posts...
            </div>
          )}
        </>
      )}
    </div>
  );
}
