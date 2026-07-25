import { create } from "zustand";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import { getPageBlocks, isBlockHidden } from "src/replicache/getBlocks";

export const useSelectingMouse = create(() => ({
  start: null as null | string,
}));

export const getSortedSelection = async (
  rep: Replicache<ReplicacheMutators>,
) => {
  let selectedBlocks = useUIState.getState().selectedBlocks;
  let foldedBlocks = useUIState.getState().foldedBlocks;
  if (!selectedBlocks[0]) return [[], []];
  let siblings = getPageBlocks(rep, selectedBlocks[0].parent);
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
