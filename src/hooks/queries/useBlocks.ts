import { useMemo } from "react";
import { useReplicache } from "src/replicache";
import { scanIndexLocal } from "src/replicache/utils";
import {
  getBlocksFromMirror,
  getBlocksWithTypeLocal,
  getPageReadingOrder,
  SyncScan,
} from "src/replicache/getBlocks";
import { canvasBlockOrder } from "src/utils/canvasBlockOrder";
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
  return (blocks || initialValue).toSorted((a, b) =>
    canvasBlockOrder(a.position, b.position),
  );
};

const readingOrderAttributes = [...blockListAttributes, "canvas/block"];

// A page's blocks in reading order (see getPageReadingOrder), for the
// surfaces that read a page's first blocks whatever kind of page it is.
export const usePageReadingOrder = (pageID: string | null) => {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      pageID === null
        ? []
        : getPageReadingOrder(scanIndexLocal(rep.initialFacts), pageID),
    [rep.initialFacts, pageID],
  );
  let blocks = useMirrorQuery(
    readingOrderAttributes,
    (mirror) => (pageID === null ? [] : getPageReadingOrder(mirror, pageID)),
    [pageID],
  );
  return blocks || initialValue;
};
