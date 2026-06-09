// A publication page's *published* nav state. Editing happens against the live
// `path`/`title`/`sort_order` columns on the row (the draft); publishing
// snapshots those into `published_metadata`, and the public site reads only
// from this snapshot. That's what keeps draft edits to a nav tab — renaming it,
// changing its path/url, reordering — out of production until the next publish.
//
// For external link tabs `path` holds the full URL (see isExternalLink).
export type PublishedPageMetadata = {
  path: string;
  title: string;
  sort_order: string;
};

export function getPublishedPageMetadata(
  published_metadata: unknown,
): PublishedPageMetadata | null {
  let pm = published_metadata as Partial<PublishedPageMetadata> | null;
  if (!pm || typeof pm.path !== "string" || typeof pm.sort_order !== "string")
    return null;
  return { path: pm.path, title: pm.title ?? "", sort_order: pm.sort_order };
}

// Find the page row whose *published* path matches the requested path. Matching
// on the snapshot (not the live draft `path` column) is what keeps an
// unpublished path edit from changing which URL serves the page — every public
// reader (page body, metadata) must match this way or they'll disagree.
export function findPublishedPage<T extends { published_metadata: unknown }>(
  pages: T[] | null | undefined,
  path: string,
): { page: T; metadata: PublishedPageMetadata } | null {
  for (let page of pages ?? []) {
    let metadata = getPublishedPageMetadata(page.published_metadata);
    if (metadata?.path === path) return { page, metadata };
  }
  return null;
}

// Map raw publication_pages rows to the published nav tabs the public site
// renders. Rows without a published snapshot (never-published drafts) are
// dropped. The returned fields are the *published* values, not the live
// draft columns.
export function publishedNavPages(
  pages: { id: number; published_metadata: unknown }[] | null | undefined,
): { id: number; path: string; title: string; sort_order: string }[] {
  return (pages ?? []).flatMap((p) => {
    let pm = getPublishedPageMetadata(p.published_metadata);
    return pm
      ? [{ id: p.id, path: pm.path, title: pm.title, sort_order: pm.sort_order }]
      : [];
  });
}
