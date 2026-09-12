"use client";

import useSWRImmutable from "swr/immutable";
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

// useSWRImmutable never revalidates a key once it has data, so a card that
// has been seen this session renders its preview on the first frame of any
// later mount, and delivery can't change `facts` identity after it lands.
export function useLeafletFacts(root: string, enabled: boolean) {
  const { data } = useSWRImmutable(
    enabled ? `leaflet-facts:${root}` : null,
    () => leafletFactsBatcher.fetch(root),
  );
  return data ?? null;
}
