// Shared (non-"use server") helpers for the posts-list block's URI-batch
// pagination. The full ordered list of post URIs is produced wherever the list
// originates (editor: already-loaded data; published: the SSR page query); the
// paginated component then hydrates them in batches via a `loadBatch` function.
// Keeping these out of the "use server" hydrator module lets client components
// import them (a "use server" module may only export async functions).

import type { PublicationPostsListPost } from "./buildPublicationPosts";

export const POSTS_LIST_PAGE_SIZE = 20;

// Stable key for a tag filter, independent of selection order. Used to match a
// posts-list block to its SSR-seeded first batch.
export function postsListFilterKey(tags?: string[] | null): string {
  return tags && tags.length > 0 ? [...tags].sort().join(",") : "";
}

type SortablePost = { uri: string; record: { publishedAt?: string } };

// Newest-first by publishedAt (the block's historical order), uri as a stable
// tiebreak. Returns a new array.
export function sortPostsForList<T extends SortablePost>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const ad = a.record.publishedAt ? new Date(a.record.publishedAt).getTime() : 0;
    const bd = b.record.publishedAt ? new Date(b.record.publishedAt).getTime() : 0;
    if (ad !== bd) return bd - ad;
    return a.uri < b.uri ? 1 : -1;
  });
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
