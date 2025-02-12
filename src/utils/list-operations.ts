import { Block } from "components/Blocks/Block";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import { v7 } from "uuid";

export function indent(
  block: Block,
  previousBlock?: Block,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!block.listData) return false;
  if (!previousBlock?.listData) return false;
  let depth = block.listData.depth;
  let newParent = previousBlock.listData.path.find((f) => f.depth === depth);
  if (!newParent) return false;
  if (useUIState.getState().foldedBlocks.includes(newParent.entity))
    useUIState.getState().toggleFold(newParent.entity);
  rep?.mutate.retractFact({ factID: block.factID });
  rep?.mutate.addLastBlock({
    parent: newParent.entity,
    factID: v7(),
    entity: block.value,
  });
  return true;
}

export function outdentFull(
  block: Block,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!block.listData) return;

  // make this block not a list
  rep?.mutate.assertFact({
    entity: block.value,
    attribute: "block/is-list",
    data: { type: "boolean", value: false },
  });

  // find the next block that is a level 1 list item or not a list item.
  // If there are none or this block is a level 1 list item, we don't need to move anything

  let after = block.listData?.path.find((f) => f.depth === 1)?.entity;

  // move this block to be after that block
  after &&
    after !== block.value &&
    rep?.mutate.moveBlock({
      block: block.value,
      oldParent: block.listData.parent,
      newParent: block.parent,
      position: { type: "after", entity: after },
    });

  // move all the childen to the be under it as a level 1 list item
  rep?.mutate.moveChildren({
    oldParent: block.value,
    newParent: block.parent,
    after: block.value,
  });
}

export function outdent(
  block: Block,
  previousBlock: Block | null,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!block.listData) return false;
  let listData = block.listData;
  if (listData.depth === 1) {
    rep?.mutate.assertFact({
      entity: block.value,
      attribute: "block/is-list",
      data: { type: "boolean", value: false },
    });
    rep?.mutate.moveChildren({
      oldParent: block.value,
      newParent: block.parent,
      after: block.value,
    });
  } else {
    if (!previousBlock || !previousBlock.listData) return false;
    let after = previousBlock.listData.path.find(
      (f) => f.depth === listData.depth - 1,
    )?.entity;
    if (!after) return false;
    let parent: string | undefined = undefined;
    if (listData.depth === 2) {
      parent = block.parent;
    } else {
      parent = previousBlock.listData.path.find(
        (f) => f.depth === listData.depth - 2,
      )?.entity;
    }
    if (!parent) return false;
    if (useUIState.getState().foldedBlocks.includes(parent))
      useUIState.getState().toggleFold(parent);
    rep?.mutate.outdentBlock({
      block: block.value,
      newParent: parent,
      oldParent: listData.parent,
      after,
    });
  }
}
