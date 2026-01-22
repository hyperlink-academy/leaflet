import { Block } from "components/Blocks/Block";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { v7 } from "uuid";
import { getBlocksWithType } from "src/replicache/getBlocks";

export function orderListItems(
  block: Block,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!block.listData) return;
  rep?.mutate.assertFact({
    entity: block.value,
    attribute: "block/list-style",
    data: { type: "list-style-union", value: "ordered" },
  });
}

export function unorderListItems(
  block: Block,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!block.listData) return;
  // Remove list-style attribute to convert back to unordered
  rep?.mutate.retractAttribute({
    entity: block.value,
    attribute: "block/list-style",
  });
}

export function indent(
  block: Block,
  previousBlock?: Block,
  rep?: Replicache<ReplicacheMutators> | null,
  foldState?: {
    foldedBlocks: string[];
    toggleFold: (entityID: string) => void;
  },
) {
  if (!block.listData) return false;

  // All lists use parent/child structure - move to new parent
  if (!previousBlock?.listData) return false;
  let depth = block.listData.depth;
  let newParent = previousBlock.listData.path.find((f) => f.depth === depth);
  if (!newParent) return false;
  if (foldState && foldState.foldedBlocks.includes(newParent.entity))
    foldState.toggleFold(newParent.entity);
  rep?.mutate.retractFact({ factID: block.factID });
  rep?.mutate.addLastBlock({
    parent: newParent.entity,
    factID: v7(),
    entity: block.value,
  });

  // Reset number to 1 for ordered lists when indenting
  if (block.listData.listStyle === "ordered") {
    rep?.mutate.assertFact({
      entity: block.value,
      attribute: "block/list-number",
      data: { type: "number", value: 1 },
    });
  }

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

  // All lists use nested structure - need to handle parent/child structure
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

export async function outdent(
  block: Block,
  previousBlock: Block | null,
  rep?: Replicache<ReplicacheMutators> | null,
  foldState?: {
    foldedBlocks: string[];
    toggleFold: (entityID: string) => void;
  },
) {
  if (!block.listData) return false;
  let listData = block.listData;

  // All lists use parent/child structure - move blocks between parents
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
    if (foldState && foldState.foldedBlocks.includes(parent))
      foldState.toggleFold(parent);
    rep?.mutate.outdentBlock({
      block: block.value,
      newParent: parent,
      oldParent: listData.parent,
      after,
    });

    // For ordered lists, calculate the next number at the new depth
    if (listData.listStyle === "ordered") {
      let targetDepth = listData.depth - 1;
      let allBlocks = await rep?.query((tx) =>
        getBlocksWithType(tx, block.parent),
      );
      let previousAtDepth: Block | null = null;
      if (allBlocks) {
        let currentIndex = allBlocks.findIndex((b) => b.value === block.value);
        for (let i = currentIndex - 1; i >= 0; i--) {
          let b = allBlocks[i];
          if (
            b.listData?.listStyle === "ordered" &&
            b.listData?.depth === targetDepth
          ) {
            previousAtDepth = b;
            break;
          }
        }
      }

      let nextNumber = previousAtDepth?.listData?.listNumber
        ? previousAtDepth.listData.listNumber + 1
        : 1;

      rep?.mutate.assertFact({
        entity: block.value,
        attribute: "block/list-number",
        data: { type: "number", value: nextNumber },
      });
    }
  }
}
