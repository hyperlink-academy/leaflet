export type PrevNextCandidate = {
  uri: string | null;
  sort_date: string | null;
  title: string | null;
  publishedAt: string | null;
};

/**
 * The ordered run of posts the prev/next buttons page through, oldest first.
 * The post page and the revalidation of its neighbours both derive adjacency
 * from this, so they must never disagree on which posts count or how ties
 * break.
 */
export function sortPostsForPrevNext<T extends PrevNextCandidate>(docs: T[]) {
  return docs
    .filter((doc) => doc.publishedAt && doc.title)
    .sort(
      (a, b) =>
        new Date(a.sort_date || 0).getTime() -
        new Date(b.sort_date || 0).getTime(),
    );
}

/**
 * The posts whose prev/next buttons point at `doc`. When `doc` is still in
 * `sorted` they're its index neighbours; when it has been deleted they're the
 * posts that bracketed its `sort_date`, which now point at each other.
 * `atEdge` reports whether `doc` is (or was) the first or last post, which is
 * what the first/last buttons on every other post render.
 */
export function adjacentPosts<T extends PrevNextCandidate>(
  sorted: T[],
  doc: { uri: string; sort_date: string | null | undefined },
): { prev?: T; next?: T; atEdge: boolean } {
  const index = sorted.findIndex((d) => d.uri === doc.uri);
  if (index !== -1)
    return {
      prev: sorted[index - 1],
      next: sorted[index + 1],
      atEdge: index === 0 || index === sorted.length - 1,
    };
  const time = new Date(doc.sort_date || 0).getTime();
  const nextIndex = sorted.findIndex(
    (d) => new Date(d.sort_date || 0).getTime() > time,
  );
  const next = nextIndex === -1 ? undefined : sorted[nextIndex];
  const prev =
    nextIndex === -1 ? sorted[sorted.length - 1] : sorted[nextIndex - 1];
  return { prev, next, atEdge: !prev || !next };
}
