"use client";
import { useMemo } from "react";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";
import { canvasStackingOrder } from "src/utils/canvasBlockOrder";

// The block entity IDs of a canvas in paint order, lowest first. Stacking is
// global to the canvas, so it can't be derived per-block the way width and
// rotation are.
export function useCanvasPaintOrder(page: string): string[] {
  let { rep } = useReplicache();
  return useSubscribe(
    rep,
    async (tx) => {
      let blocks = await scanIndex(tx).eav(page, "canvas/block");
      let layers = await Promise.all(
        blocks.map(async (f) => ({
          entityID: f.data.value,
          x: f.data.position.x,
          y: f.data.position.y,
          stackOrder:
            (
              await scanIndex(tx).eav(f.data.value, "canvas/block/stack-order")
            )[0]?.data.value ?? null,
        })),
      );
      return layers.sort(canvasStackingOrder).map((l) => l.entityID);
    },
    {
      default: [] as string[],
      dependencies: [page],
      isEqual: (a, b) => a.length === b.length && a.every((e, i) => e === b[i]),
    },
  );
}

// The same thing keyed by block, for rendering.
export function useCanvasStackOrders(page: string) {
  let order = useCanvasPaintOrder(page);
  return useMemo(
    () => new Map(order.map((entityID, index) => [entityID, index + 1])),
    [order],
  );
}
