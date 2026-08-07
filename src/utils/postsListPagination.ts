// Shared (non-"use server") helpers for the posts-list block's URI-batch
// pagination. The full ordered list of post URIs is produced wherever the list
// originates (editor: already-loaded data; published: the SSR page query); the
// paginated component then hydrates them in batches via a `loadBatch` function.
// Keeping these out of the "use server" hydrator module lets client components
// import them (a "use server" module may only export async functions).

import type { PublicationPostsListPost } from "./buildPublicationPosts";

export const POSTS_LIST_PAGE_SIZE = 20;

export type PostsListView = "small" | "medium" | "chapter";

// The lexicon's `view` is an open string, so a block may carry one this build
// doesn't know; anything unrecognised reads as the default.
export function resolvePostsListView(view?: string): PostsListView {
  return view === "small" || view === "chapter" ? view : "medium";
}

// Stable key for a tag filter, independent of selection order. Used to match a
// posts-list block to its SSR-seeded first batch.
export function postsListFilterKey(tags?: string[] | null): string {
  return tags && tags.length > 0 ? [...tags].sort().join(",") : "";
}

// Which SSR seed a posts-list block wants. The view is part of it because
// chapter view pages the archive from the opposite end, so its first batch is a
// different set of posts than every other view's.
export function postsListSeedKey(
  view: PostsListView,
  tags?: string[] | null,
): string {
  return `${view === "chapter" ? "chapter" : "list"}:${postsListFilterKey(tags)}`;
}

type SortablePost = { uri: string; record: { publishedAt?: string } };

// Newest-first by publishedAt (the block's historical order), uri as a stable
// tiebreak. Returns a new array. Private to orderPostsForView: sorting at a
// call site is how a list ends up paging one way and rendering the other.
function sortPostsForList<T extends SortablePost>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const ad = a.record.publishedAt
      ? new Date(a.record.publishedAt).getTime()
      : 0;
    const bd = b.record.publishedAt
      ? new Date(b.record.publishedAt).getTime()
      : 0;
    if (ad !== bd) return bd - ad;
    return a.uri < b.uri ? 1 : -1;
  });
}

// The order a view walks the archive in, and — either way — the most recent
// post, which the "Latest" highlight above a chapter shelf needs whichever end
// pagination starts from.
//
// Chapter view reads a serialised archive from its start, so it leads with the
// oldest post and works forward; every other view leads with the newest. This
// is the order pagination pages through, so callers must seed their first batch
// from the same array or the two disagree about what page 0 is.
export function orderPostsForView<T extends SortablePost>(
  posts: T[],
  view: PostsListView,
): { ordered: T[]; latest: T | undefined } {
  const newestFirst = sortPostsForList(posts);
  return {
    ordered: view === "chapter" ? [...newestFirst].reverse() : newestFirst,
    latest: newestFirst[0],
  };
}

export function filterPostsByTags<T extends { record: { tags?: string[] } }>(
  posts: T[],
  tags?: string[] | null,
): T[] {
  if (!tags || tags.length === 0) return posts;
  return posts.filter((p) => p.record.tags?.some((t) => tags.includes(t)));
}

// A hydrate function turns a batch of post URIs into renderable posts (in the
// same order), resolving counts/bylines however the caller sees fit.
export type LoadPostsBatch = (
  uris: string[],
) => Promise<PublicationPostsListPost[]>;
