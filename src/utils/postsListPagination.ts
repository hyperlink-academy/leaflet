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

type SortablePost = { uri: string; record: { publishedAt?: string } };

type DatedUri = { uri: string; publishedAt?: string };

function compareLatest(a: DatedUri, b: DatedUri): number {
  const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
  const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
  if (ad !== bd) return bd - ad;
  return a.uri < b.uri ? 1 : -1;
}

// Newest-first by publishedAt (the block's historical order), uri as a stable
// tiebreak. Returns a new array.
export function sortPostsForList<T extends SortablePost>(posts: T[]): T[] {
  return [...posts].sort((a, b) =>
    compareLatest(
      { uri: a.uri, publishedAt: a.record.publishedAt },
      { uri: b.uri, publishedAt: b.record.publishedAt },
    ),
  );
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

// ---------------------------------------------------------------------------
// Reader controls
//
// The author can put search / tag-filter / sort controls above a posts-list
// block. Those reorder and subset the whole list, not just the batch that's
// currently rendered, so the client needs to know about every post — but
// rendering one needs its cover, byline and counts, which is exactly what
// pagination exists to avoid shipping. So the client gets a small index (one
// short search string plus the sort keys per post), narrows *that* down to an
// ordered URI list, and the existing batch hydrator fills in the rest.
// ---------------------------------------------------------------------------

export type PostsListSort = "latest" | "oldest" | "top";

export type PostsListReaderControls = {
  search: boolean;
  tagFilter: boolean;
  sort: boolean;
};

export type PostsListReaderControlsFlags = {
  readerControls?: boolean;
  readerSearch?: boolean;
  readerTagFilter?: boolean;
  readerSort?: boolean;
};

// Which controls a block actually shows, or undefined for none. The sub-flags
// default to on so a record that only carries `readerControls` still renders
// something.
export function resolveReaderControls(
  flags: PostsListReaderControlsFlags,
): PostsListReaderControls | undefined {
  if (!flags.readerControls) return undefined;
  const controls = {
    search: flags.readerSearch ?? true,
    tagFilter: flags.readerTagFilter ?? true,
    sort: flags.readerSort ?? true,
  };
  if (!controls.search && !controls.tagFilter && !controls.sort) return;
  return controls;
}

export type PostsListIndexEntry = {
  uri: string;
  // Lowercased title + description, truncated — the haystack `search` matches
  // against. Never rendered.
  text: string;
  tags?: string[];
  publishedAt?: string;
  // Engagement total behind the "Top" sort.
  score?: number;
};

const INDEX_TEXT_LENGTH = 280;

type IndexablePost = {
  uri: string;
  record: {
    title?: string;
    description?: string;
    tags?: string[];
    publishedAt?: string;
  };
  commentsCount: number;
  mentionsCount: number;
  recommendsCount: number;
};

// `descriptionFor` lets the caller fall back to the post's first paragraph the
// way the list itself does, without this module depending on the record shape.
export function buildPostsListIndex<T extends IndexablePost>(
  posts: T[],
  descriptionFor?: (post: T) => string | undefined,
): PostsListIndexEntry[] {
  return posts.map((p) => {
    const description =
      p.record.description || descriptionFor?.(p) || undefined;
    const score = p.commentsCount + p.mentionsCount + p.recommendsCount;
    return {
      uri: p.uri,
      text: [p.record.title, description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .slice(0, INDEX_TEXT_LENGTH),
      ...(p.record.tags?.length && { tags: p.record.tags }),
      ...(p.record.publishedAt && { publishedAt: p.record.publishedAt }),
      ...(score > 0 && { score }),
    };
  });
}

function matchesSearch(entry: PostsListIndexEntry, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = entry.tags?.length
    ? `${entry.text} ${entry.tags.join(" ").toLowerCase()}`
    : entry.text;
  return terms.every((t) => haystack.includes(t));
}

// The ordered URI list a posts-list block should render given the reader's
// current control state. With everything at its default this returns the same
// order as `sortPostsForList`, so the server-seeded first batch still lines up.
export function readerControlledUris(
  index: PostsListIndexEntry[],
  state: { search?: string; tag?: string | null; sort?: PostsListSort },
): string[] {
  const terms = (state.search ?? "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const tag = state.tag ?? null;
  const filtered = index.filter(
    (e) => (!tag || !!e.tags?.includes(tag)) && matchesSearch(e, terms),
  );
  const sorted = [...filtered].sort((a, b) => {
    if (state.sort === "oldest") return -compareLatest(a, b);
    if (state.sort === "top") {
      const diff = (b.score ?? 0) - (a.score ?? 0);
      if (diff !== 0) return diff;
    }
    return compareLatest(a, b);
  });
  return sorted.map((e) => e.uri);
}

// Tags used by the posts in `index`, most used first (name as a stable
// tiebreak). Feeds the reader's tag dropdown.
export function tagCountsForIndex(
  index: PostsListIndexEntry[],
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of index)
    for (const tag of entry.tags ?? [])
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) =>
      b.count - a.count ||
      a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" }),
  );
}
