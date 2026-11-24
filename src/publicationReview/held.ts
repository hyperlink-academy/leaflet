import { supabaseServerClient } from "supabase/serverClient";
import { authorOf, blockedAmong } from "src/review/blocked";

// Drops the items that are held out of discovery: those belonging to a
// publication still waiting in the review queue or flagged as spam, and those
// written by a blocked account, in a publication or not. Publications that
// predate the queue have no review row and are never held. A failed lookup
// holds nothing, so a review-table outage can't empty the feeds.
export async function dropHeld<T>(
  items: T[],
  publicationUris: (item: T) => (string | null | undefined)[],
  documentUri: (item: T) => string,
): Promise<T[]> {
  if (items.length === 0) return items;
  let uris = [
    ...new Set(items.flatMap(publicationUris).filter((u): u is string => !!u)),
  ];
  let authors = items.flatMap((item) => authorOf(documentUri(item)) ?? []);

  let [held, blocked] = await Promise.all([
    heldPublications(uris),
    blockedAmong(authors),
  ]);
  if (held.size === 0 && blocked.size === 0) return items;
  return items.filter((item) => {
    let author = authorOf(documentUri(item));
    if (author && blocked.has(author)) return false;
    return !publicationUris(item).some((u) => u && held.has(u));
  });
}

async function heldPublications(uris: string[]): Promise<Set<string>> {
  if (uris.length === 0) return new Set();
  let { data, error } = await supabaseServerClient
    .from("publication_reviews")
    .select("publication")
    .in("publication", uris)
    .or("reviewed_at.is.null,spam.eq.true");
  if (error) {
    console.error("[publicationReview] held lookup failed:", error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.publication));
}
