import { useMemo } from "react";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useReplicache } from "src/replicache";
import { scanIndex, scanIndexLocal } from "src/replicache/utils";
import { getBlocksWithType, getBlocksWithTypeLocal } from "src/replicache/getBlocks";

export const useBlocks = (entityID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      entityID === null
        ? []
        : getBlocksWithTypeLocal(rep.initialFacts, entityID),
    [rep.initialFacts, entityID],
  );
  let repData = useSubscribe(
    rep?.rep,
    async (tx) => (entityID === null ? [] : getBlocksWithType(tx, entityID)),
    { dependencies: [entityID] },
  );
  let data = repData || initialValue;
  return data.flatMap((f) => (!f ? [] : [f]));
};

export const useCanvasBlocksWithType = (entityID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(() => {
    if (!entityID) return [];
    let scan = scanIndexLocal(rep.initialFacts);
    let blocks = scan.eav(entityID, "canvas/block");
    return blocks
      .map((b) => {
        let type = scan.eav(b.data.value, "block/type");
        if (!type[0]) return null;
        return {
          ...b.data,
          type: type[0]?.data.value || "text",
        };
      })
      .filter((f) => f !== null);
  }, [rep.initialFacts, entityID]);
  let repData = useSubscribe(
    rep?.rep,
    async (tx) => {
      if (!entityID) return [];
      let scan = scanIndex(tx);
      let blocks = await scan.eav(entityID, "canvas/block");
      return Promise.all(
        blocks.map(async (b) => {
          let type = await scan.eav(b.data.value, "block/type");
          return {
            ...b.data,
            type: type[0].data.value,
          };
        }),
      );
    },
    { dependencies: [entityID] },
  );
  let data = repData || initialValue;
  return data
    .flatMap((f) => (!f ? [] : [f]))
    .sort((a, b) => {
      if (a.position.y === b.position.y) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });
};

