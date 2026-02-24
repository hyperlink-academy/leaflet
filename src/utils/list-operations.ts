import { Block } from "components/Blocks/Block";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { v7 } from "uuid";

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

export async function indent(
  block: Block,
  previousBlock?: Block,
  rep?: Replicache<ReplicacheMutators> | null,
  foldState?: {
    foldedBlocks: string[];
    toggleFold: (entityID: string) => void;
  },
): Promise<{ success: boolean }> {
  if (!block.listData) return { success: false };

  // All lists use parent/child structure - move to new parent
  if (!previousBlock?.listData) return { success: false };
  let depth = block.listData.depth;
  let newParent = previousBlock.listData.path.find((f) => f.depth === depth);
  if (!newParent) return { success: false };
  if (foldState && foldState.foldedBlocks.includes(newParent.entity))
    foldState.toggleFold(newParent.entity);
  rep?.mutate.retractFact({ factID: block.factID });
  rep?.mutate.addLastBlock({
    parent: newParent.entity,
    factID: v7(),
    entity: block.value,
  });

  return { success: true };
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

  let after = block.listData?.path.find((f) => f.depth === 1)?.entity;

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
  previousBlock?: Block | null,
  rep?: Replicache<ReplicacheMutators> | null,
  foldState?: {
    foldedBlocks: string[];
    toggleFold: (entityID: string) => void;
  },
  excludeFromSiblings?: string[],
): Promise<{ success: boolean }> {
  if (!block.listData) return { success: false };
  let listData = block.listData;

  // All lists use parent/child structure - move blocks between parents
  if (listData.depth === 1) {
    await rep?.mutate.assertFact({
      entity: block.value,
      attribute: "block/is-list",
      data: { type: "boolean", value: false },
    });
    await rep?.mutate.moveChildren({
      oldParent: block.value,
      newParent: block.parent,
      after: block.value,
    });
    return { success: true };
  } else {
    // Use block's own path for ancestry lookups - it always has correct info
    // even in multiselect scenarios where previousBlock may be stale
    let after = listData.path.find(
      (f) => f.depth === listData.depth - 1,
    )?.entity;
    if (!after) return { success: false };
    let parent: string | undefined = undefined;
    if (listData.depth === 2) {
      parent = block.parent;
    } else {
      parent = listData.path.find(
        (f) => f.depth === listData.depth - 2,
      )?.entity;
    }
    if (!parent) return { success: false };
    if (foldState && foldState.foldedBlocks.includes(parent))
      foldState.toggleFold(parent);
    await rep?.mutate.outdentBlock({
      block: block.value,
      newParent: parent,
      oldParent: listData.parent,
      after,
      excludeFromSiblings,
    });

    return { success: true };
  }
}

export async function multiSelectOutdent(
  sortedSelection: Block[],
  siblings: Block[],
  rep: Replicache<ReplicacheMutators>,
  foldState: { foldedBlocks: string[]; toggleFold: (entityID: string) => void },
): Promise<void> {
  let pageParent = siblings[0]?.parent;
  if (!pageParent) return;

  let selectedSet = new Set(sortedSelection.map((b) => b.value));
  let selectedEntities = sortedSelection.map((b) => b.value);

  // Check if all selected list items are at depth 1 → convert to text
  let allAtDepth1 = sortedSelection.every(
    (b) => !b.listData || b.listData.depth === 1,
  );

  if (allAtDepth1) {
    // Convert depth-1 items to plain text (outdent handles this)
    for (let i = siblings.length - 1; i >= 0; i--) {
      let block = siblings[i];
      if (!selectedSet.has(block.value)) continue;
      if (!block.listData) continue;
      await outdent(block, null, rep, foldState, selectedEntities);
    }
  } else {
    // Normal outdent: iterate backward through siblings
    for (let i = siblings.length - 1; i >= 0; i--) {
      let block = siblings[i];
      if (!selectedSet.has(block.value)) continue;
      if (!block.listData) continue;
      if (block.listData.depth === 1) continue;

      // Skip if parent is selected AND parent's depth > 1
      let parentEntity = block.listData.parent;
      if (selectedSet.has(parentEntity)) {
        let parentBlock = siblings.find((s) => s.value === parentEntity);
        if (parentBlock?.listData && parentBlock.listData.depth > 1) continue;
      }

      await outdent(block, null, rep, foldState, selectedEntities);
    }
  }
}
