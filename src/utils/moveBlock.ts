import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { getSortedSelection } from "components/SelectionManager/selectionState";
import { useUIState } from "src/useUIState";

export const moveBlockUp = async (rep: Replicache<ReplicacheMutators>) => {
  let [sortedBlocks, siblings] = await getSortedSelection(rep);
  if (sortedBlocks.length > 1) return;
  let block = sortedBlocks[0];
  let previousBlock =
    siblings?.[siblings.findIndex((s) => s.value === block.value) - 1];
  if (previousBlock.value === block.listData?.parent) {
    previousBlock =
      siblings?.[siblings.findIndex((s) => s.value === block.value) - 2];
  }

  if (
    previousBlock?.listData &&
    block.listData &&
    block.listData.depth > 1 &&
    !previousBlock.listData.path.find(
      (f) => f.entity === block.listData?.parent,
    )
  ) {
    let depth = block.listData.depth;
    let newParent = previousBlock.listData.path.find(
      (f) => f.depth === depth - 1,
    );
    if (!newParent) return;
    if (useUIState.getState().foldedBlocks.includes(newParent.entity))
      useUIState.getState().toggleFold(newParent.entity);
    rep?.mutate.moveBlock({
      block: block.value,
      oldParent: block.listData?.parent,
      newParent: newParent.entity,
      position: { type: "end" },
    });
  } else {
    rep?.mutate.moveBlockUp({
      entityID: block.value,
      parent: block.listData?.parent || block.parent,
    });
  }
};

export const moveBlockDown = async (
  rep: Replicache<ReplicacheMutators>,
  permission_set: string,
) => {
  let [sortedBlocks, siblings] = await getSortedSelection(rep);
  if (sortedBlocks.length > 1) return;
  let block = sortedBlocks[0];
  let nextBlock = siblings
    .slice(siblings.findIndex((s) => s.value === block.value) + 1)
    .find(
      (f) =>
        f.listData &&
        block.listData &&
        !f.listData.path.find((f) => f.entity === block.value),
    );
  if (
    nextBlock?.listData &&
    block.listData &&
    nextBlock.listData.depth === block.listData.depth - 1
  ) {
    if (useUIState.getState().foldedBlocks.includes(nextBlock.value))
      useUIState.getState().toggleFold(nextBlock.value);
    rep?.mutate.moveBlock({
      block: block.value,
      oldParent: block.listData?.parent,
      newParent: nextBlock.value,
      position: { type: "first" },
    });
  } else {
    rep?.mutate.moveBlockDown({
      entityID: block.value,
      parent: block.listData?.parent || block.parent,
      permission_set: permission_set,
    });
  }
};
