"use client";
import { useMemo } from "react";
import { useReplicache, type Fact } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";
import { readNavEntries } from "src/utils/publicationNavEntries";

export type { PublicationNavEntry } from "src/utils/publicationNavEntries";

export function usePublicationNavEntries() {
  let { rep, rootEntity, initialFacts } = useReplicache();

  let fallback = useMemo(
    () => readNavEntries(initialFacts, rootEntity),
    [initialFacts, rootEntity],
  );

  let data = useSubscribe(
    rep,
    async (tx) => {
      let initialized = await tx.get("initialized");
      if (!initialized) return null;
      let scan = scanIndex(tx);
      let navFacts = (await scan.eav(
        rootEntity,
        "root/page",
      )) as Fact<"root/page">[];
      return Promise.all(
        navFacts.map(async (f) => ({
          entity: f.data.value,
          factID: f.id,
          position: f.data.position,
          title:
            (await scan.eav(f.data.value, "page/title"))[0]?.data.value ?? "",
          route:
            (await scan.eav(f.data.value, "page/route"))[0]?.data.value ??
            null,
          externalUrl:
            (await scan.eav(f.data.value, "page/external-url"))[0]?.data
              .value ?? null,
        })),
      );
    },
    { default: null, dependencies: [rootEntity] },
  );

  let entries = data ?? fallback;
  return useMemo(
    () =>
      [...entries].sort((a, b) => (a.position > b.position ? 1 : -1)),
    [entries],
  );
}
