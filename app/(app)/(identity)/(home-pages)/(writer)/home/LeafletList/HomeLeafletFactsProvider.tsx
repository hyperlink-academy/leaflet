"use client";

import useSWR from "swr";
import { create, windowScheduler } from "@yornaath/batshit";
import { callRPC } from "app/api/rpc/client";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

const leafletFactsBatcher = create({
  fetcher: async (roots: string[]) => {
    const response = await callRPC("getFactsForRoots", { roots });
    return response.result.facts as { [root: string]: Fact<Attribute>[] };
  },
  resolver: (results, root: string) => results[root] ?? [],
  scheduler: windowScheduler(10),
});

// Revalidation on mount is what keeps a preview current after the user edits
// that leaflet and comes back: signed in, the card reads only from these facts,
// so a key that never refetches leaves the card showing pre-edit content until
// a full reload. SWR keeps the previous data while revalidating and nothing is
// keyed off the facts any more, so fresher data only re-renders readers — it
// cannot blank a card or remount its provider.
export function useLeafletFacts(root: string, enabled: boolean) {
  const { data } = useSWR(
    enabled ? `leaflet-facts:${root}` : null,
    () => leafletFactsBatcher.fetch(root),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  return data ?? null;
}
