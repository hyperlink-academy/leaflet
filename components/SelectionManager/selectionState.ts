import { create } from "zustand";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import { getBlocksWithType } from "src/replicache/getBlocks";

export const useSelectingMouse = create(() => ({
  start: null as null | string,
}));

export const getSortedSelection = async (
  rep: Replicache<ReplicacheMutators>,
) => {
  let selectedBlocks = useUIState.getState().selectedBlocks;
  let foldedBlocks = useUIState.getState().foldedBlocks;
  if (!selectedBlocks[0]) return [[], []];
  let siblings =
    (await rep?.query((tx) =>
      getBlocksWithType(tx, selectedBlocks[0].parent),
    )) || [];
  let sortedBlocks = siblings.filter((s) => {
    let selected = selectedBlocks.find((sb) => sb.value === s.value);
    return selected;
  });
  let sortedBlocksWithChildren = siblings.filter((s) => {
    let selected = selectedBlocks.find((sb) => sb.value === s.value);
    if (s.listData && !selected) {
      //Select the children of folded list blocks (in order to copy them)
      return s.listData.path.find(
        (p) =>
          selectedBlocks.find((sb) => sb.value === p.entity) &&
          foldedBlocks.includes(p.entity),
      );
    }
    return selected;
  });
  return [
    sortedBlocks,
    siblings.filter(
      (f) =>
        !f.listData ||
        !f.listData.path.find(
          (p) => foldedBlocks.includes(p.entity) && p.entity !== f.value,
        ),
    ),
    sortedBlocksWithChildren,
  ];
};
