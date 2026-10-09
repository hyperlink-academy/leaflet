"use client";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";
import { canvasLayers } from "src/replicache/mutations";

// The block entity IDs of a canvas in paint order, lowest first.
export function useCanvasPaintOrder(page: string): string[] {
  let { rep } = useReplicache();
  return useSubscribe(
    rep,
    async (tx) =>
      (await canvasLayers({ scanIndex: scanIndex(tx) }, page)).map(
        (l) => l.entityID,
      ),
    {
      default: [] as string[],
      dependencies: [page],
      isEqual: (a, b) => a.length === b.length && a.every((e, i) => e === b[i]),
    },
  );
}
