import { useMemo } from "react";
import { useReplicache } from "src/replicache";
import { scanIndexLocal } from "src/replicache/utils";
import {
  getBlocksFromMirror,
  getBlocksWithTypeLocal,
  SyncScan,
} from "src/replicache/getBlocks";
import { blockListAttributes } from "src/replicache/blockMirror";
import { useMirrorQuery } from "src/hooks/useMirrorQuery";

export const useBlocks = (entityID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      entityID === null
        ? []
        : getBlocksWithTypeLocal(rep.initialFacts, entityID),
    [rep.initialFacts, entityID],
  );
  let blocks = useMirrorQuery(
    blockListAttributes,
    (mirror) =>
      entityID === null ? [] : getBlocksFromMirror(mirror, entityID),
    [entityID],
  );
  return blocks || initialValue;
};

const canvasAttributes = ["canvas/block", "block/type"];

const assembleCanvasBlocks = (scan: SyncScan, entityID: string) =>
  scan
    .eav(entityID, "canvas/block")
    .map((b) => {
      let type = scan.eav(b.data.value, "block/type")[0];
      if (!type) return null;
      return { ...b.data, type: type.data.value };
    })
    .filter((f) => f !== null);

export const useCanvasBlocksWithType = (entityID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      entityID === null
        ? []
        : assembleCanvasBlocks(scanIndexLocal(rep.initialFacts), entityID),
    [rep.initialFacts, entityID],
  );
  let blocks = useMirrorQuery(
    canvasAttributes,
    (mirror) => (entityID === null ? [] : assembleCanvasBlocks(mirror, entityID)),
    [entityID],
  );
  return (blocks || initialValue).toSorted((a, b) => {
    if (a.position.y === b.position.y) {
      return a.position.x - b.position.x;
    }
    return a.position.y - b.position.y;
  });
};
