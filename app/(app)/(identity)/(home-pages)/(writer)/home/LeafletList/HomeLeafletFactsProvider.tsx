"use client";

import { useEffect, useState } from "react";
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

const factsCache = new Map<string, Fact<Attribute>[]>();

// A one-way latch: null until this card's facts are in hand, then an array
// that is only ever replaced by another array. Nothing sets it back to null,
// so a card body goes blank → content exactly once per mount and never back.
// The module cache means a card that has been seen once this session renders
// its preview on the first frame of any later mount.
export function useLeafletFacts(root: string, enabled: boolean) {
  let [facts, setFacts] = useState<Fact<Attribute>[] | null>(
    () => factsCache.get(root) ?? null,
  );
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    leafletFactsBatcher.fetch(root).then((fetched) => {
      factsCache.set(root, fetched);
      if (live) setFacts(fetched);
    });
    return () => {
      live = false;
    };
  }, [enabled, root]);
  return facts;
}
