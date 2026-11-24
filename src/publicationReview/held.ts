import { supabaseServerClient } from "supabase/serverClient";

// Drops the items belonging to a publication that is held out of discovery:
// one still waiting in the review queue, or flagged as spam. Publications
// that predate the queue have no review row and are never held. A failed
// lookup holds nothing, so a review-table outage can't empty the feeds.
export async function dropHeld<T>(
  items: T[],
  publicationUris: (item: T) => (string | null | undefined)[],
): Promise<T[]> {
  let uris = [
    ...new Set(items.flatMap(publicationUris).filter((u): u is string => !!u)),
  ];
  if (uris.length === 0) return items;

  let { data, error } = await supabaseServerClient
    .from("publication_reviews")
    .select("publication")
    .in("publication", uris)
    .or("reviewed_at.is.null,spam.eq.true");
  if (error) {
    console.error("[publicationReview] held lookup failed:", error);
    return items;
  }
  let held = new Set((data ?? []).map((r) => r.publication));
  if (held.size === 0) return items;
  return items.filter(
    (item) => !publicationUris(item).some((u) => u && held.has(u)),
  );
}
