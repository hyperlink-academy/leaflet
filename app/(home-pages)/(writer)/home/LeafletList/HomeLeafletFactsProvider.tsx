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

export function useLeafletFacts(root: string, enabled: boolean = true) {
  const { data, isLoading } = useSWR(
    enabled ? `leaflet-facts:${root}` : null,
    () => leafletFactsBatcher.fetch(root),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  return { facts: data ?? null, isLoading };
}
