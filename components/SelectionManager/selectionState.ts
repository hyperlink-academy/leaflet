import { create } from "zustand";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import {
  filterBlocksForZoom,
  getCanvasBlock,
  getPageBlocks,
  isBlockHidden,
} from "src/replicache/getBlocks";

export const useSelectingMouse = create(() => ({
  start: null as null | string,
}));

export const getViewBlocks = (
  rep: Replicache<ReplicacheMutators>,
  page: string,
) =>
  filterBlocksForZoom(
    getPageBlocks(rep, page),
    useUIState.getState().zoomedBlocks[page],
  );

// Toolbar actions run against the selection, but the toolbar is also shown for
// a block that has focus without ever having been selected (e.g. focused
// programmatically after a block is created), so fall back to that block.
// Blocks placed on a canvas have no siblings to be sorted among, so they are
// looked up one by one.
export const getSelectedOrFocusedBlocks = async (
  rep: Replicache<ReplicacheMutators>,
) => {
  let [sortedBlocks] = await getSortedSelection(rep);
  if (sortedBlocks.length > 0) return sortedBlocks;
  let { selectedBlocks, focusedEntity: focused } = useUIState.getState();
  let canvasBlocks = selectedBlocks.flatMap(
    (b) => getCanvasBlock(rep, b.parent, b.entityID) ?? [],
  );
  if (canvasBlocks.length > 0) return canvasBlocks;
  if (!focused || focused.entityType !== "block") return [];
  let canvasBlock = getCanvasBlock(rep, focused.parent, focused.entityID);
  if (canvasBlock) return [canvasBlock];
  return getViewBlocks(rep, focused.parent).filter(
    (s) => s.entityID === focused.entityID,
  );
};

export const getSortedSelection = async (
  rep: Replicache<ReplicacheMutators>,
) => {
  let selectedBlocks = useUIState.getState().selectedBlocks;
  if (!selectedBlocks[0]) return [[], []];
  let siblings = getViewBlocks(rep, selectedBlocks[0].parent);
  let siblingIDs = new Set(siblings.map((block) => block.entityID));
  let foldedBlocks = useUIState
    .getState()
    .foldedBlocks.filter((entity) => siblingIDs.has(entity));
  let sortedBlocks = siblings.filter((s) => {
    let selected = selectedBlocks.find((sb) => sb.entityID === s.entityID);
    return selected;
  });
  let sortedBlocksWithChildren = siblings.filter((s) => {
    let selected = selectedBlocks.find((sb) => sb.entityID === s.entityID);
    if (s.listData && !selected) {
      //Select the children of folded list blocks (in order to copy them)
      return s.listData.path.find(
        (p) =>
          selectedBlocks.find((sb) => sb.entityID === p.entity) &&
          foldedBlocks.includes(p.entity),
      );
    }
    return selected;
  });
  return [
    sortedBlocks,
    siblings.filter((f) => !isBlockHidden(f, foldedBlocks)),
    sortedBlocksWithChildren,
  ];
};
