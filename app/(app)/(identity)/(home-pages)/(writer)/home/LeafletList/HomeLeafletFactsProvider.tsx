"use client";

import { useState } from "react";
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

// A preview landing after a card tap started a navigation would render into
// the page being left and hold up the editor's commit, so cards mounted
// before the tap drop it.
let leftHomeAt = -1;
export const leaveHome = () => {
  leftHomeAt = performance.now();
};

export function useLeafletFacts(root: string, enabled: boolean = true) {
  const [mountedAt] = useState(() => performance.now());
  const { data, isLoading } = useSWR(
    enabled ? `leaflet-facts:${root}` : null,
    async () => {
      let facts = await leafletFactsBatcher.fetch(root);
      if (leftHomeAt > mountedAt) throw new Error("left home");
      return facts;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  return { facts: data ?? null, isLoading };
}
