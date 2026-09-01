import { create } from "zustand";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { getZoomedBlockPage, useUIState } from "src/useUIState";
import { getPageBlocks, isBlockHidden } from "src/replicache/getBlocks";

export const useSelectingMouse = create(() => ({
  start: null as null | string,
}));

const getSelectionBlocks = (
  rep: Replicache<ReplicacheMutators>,
  parent: string,
) => {
  let blocks = getPageBlocks(rep, parent);
  let page = getZoomedBlockPage(parent);
  let root =
    page && getPageBlocks(rep, page).find((b) => b.entityID === parent);
  if (root)
    blocks.unshift({
      ...root,
      parent,
      listData: undefined,
      headingPath: undefined,
    });
  return blocks;
};

// Toolbar actions run against the selection, but the toolbar is also shown for
// a block that has focus without ever having been selected (e.g. focused
// programmatically after a block is created), so fall back to that block.
export const getSelectedOrFocusedBlocks = async (
  rep: Replicache<ReplicacheMutators>,
) => {
  let [sortedBlocks] = await getSortedSelection(rep);
  if (sortedBlocks.length > 0) return sortedBlocks;
  let focused = useUIState.getState().focusedEntity;
  if (!focused || focused.entityType !== "block") return [];
  return getSelectionBlocks(rep, focused.parent).filter(
    (s) => s.entityID === focused.entityID,
  );
};

export const getSortedSelection = async (
  rep: Replicache<ReplicacheMutators>,
) => {
  let selectedBlocks = useUIState.getState().selectedBlocks;
  let foldedBlocks = useUIState.getState().foldedBlocks;
  if (!selectedBlocks[0]) return [[], []];
  let siblings = getSelectionBlocks(rep, selectedBlocks[0].parent);
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
