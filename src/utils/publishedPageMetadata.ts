// publication_pages rows hold *published* state only: publish snapshots each
// nav entry's path/title/sort_order (and the page record) out of the draft
// leaflet's facts, keyed by the page's entity id. Draft edits live as facts
// until the next publish, so reading these rows can never leak draft state.
//
// For external link tabs `path` holds the full URL (see isExternalLink) and
// there is no record.

// Find the row published at the requested path.
export function findPublishedPage<T extends { path: string | null }>(
  pages: T[] | null | undefined,
  path: string,
): T | null {
  return pages?.find((p) => p.path === path) ?? null;
}

// Map publication_pages rows to the nav tabs the public site renders.
export function publishedNavPages(
  pages:
    | {
        id: number;
        path: string | null;
        title: string | null;
        sort_order: string;
      }[]
    | null
    | undefined,
): { id: number; path: string; title: string; sort_order: string }[] {
  return (pages ?? []).flatMap((p) =>
    p.path
      ? [
          {
            id: p.id,
            path: p.path,
            title: p.title ?? "",
            sort_order: p.sort_order,
          },
        ]
      : [],
  );
}
