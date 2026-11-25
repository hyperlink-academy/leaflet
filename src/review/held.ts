import { authorOf, hiddenFromDiscoveryAmong } from "./blocked";

// Drops the items whose author is held out of discovery: blocked, proposed
// as spam, or waiting on a person. Their pages still load unless they are
// blocked; this only keeps them out of feeds while they are in doubt. A
// failed lookup holds nothing, so a review-table outage can't empty the feeds.
export async function dropHeld<T>(
  items: T[],
  documentUri: (item: T) => string,
): Promise<T[]> {
  if (items.length === 0) return items;
  let hidden = await hiddenFromDiscoveryAmong(
    items.flatMap((item) => authorOf(documentUri(item)) ?? []),
  );
  if (hidden.size === 0) return items;
  return items.filter((item) => {
    let author = authorOf(documentUri(item));
    return !author || !hidden.has(author);
  });
}
