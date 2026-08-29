import { Block } from "components/Blocks/Block";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import type { UndoManager } from "src/undoManager";
import { unfoldBlocks } from "src/utils/foldBlocks";

export function orderListItems(
  block: Block,
  rep?: Replicache<ReplicacheMutators> | null,
) {
  if (!block.listData) return;
  rep?.mutate.assertFact({
    entity: block.entityID,
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
    entity: block.entityID,
    attribute: "block/list-style",
  });
}

export async function indent(
  block: Block,
  previousBlock?: Block,
  rep?: Replicache<ReplicacheMutators> | null,
  undoManager?: UndoManager,
): Promise<{ success: boolean }> {
  if (!block.listData) return { success: false };

  // All lists use parent/child structure - move to new parent
  if (!previousBlock?.listData) return { success: false };
  let depth = block.listData.depth;
  let newParent = previousBlock.listData.path.find((f) => f.depth === depth);
  if (!newParent) return { success: false };
  unfoldBlocks(rep, [newParent.entity]);
  let newParentEntity = newParent.entity;
  // Reparent the block's existing card/block fact in one mutation (reusing its
  // factID) rather than retract-old + add-new-id. assertFact moves the fact and
  // captures the old (parent, position) as the single undo entry, so a split or
  // mis-grouped undo can't half-apply it and orphan the block.
  let run = () =>
    rep?.mutate.addLastBlock({
      parent: newParentEntity,
      factID: block.factID,
      entity: block.entityID,
    });
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();

  return { success: true };
}

export async function outdentFull(
  block: Block,
  rep?: Replicache<ReplicacheMutators> | null,
  undoManager?: UndoManager,
) {
  if (!block.listData) return;
  let listData = block.listData;

  let run = async () => {
    // make this block not a list
    await rep?.mutate.assertFact({
      entity: block.entityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: false },
    });

    let after = listData.path.find((f) => f.depth === 1)?.entity;

    if (after && after !== block.entityID)
      await rep?.mutate.moveBlock({
        block: block.entityID,
        oldParent: listData.parent,
        newParent: block.parent,
        position: { type: "after", entity: after },
      });

    // move all the childen to the be under it as a level 1 list item
    await rep?.mutate.moveChildren({
      oldParent: block.entityID,
      newParent: block.parent,
      after: block.entityID,
    });
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}

export async function outdent(
  block: Block,
  previousBlock?: Block | null,
  rep?: Replicache<ReplicacheMutators> | null,
  excludeFromSiblings?: string[],
  undoManager?: UndoManager,
): Promise<{ success: boolean }> {
  if (!block.listData) return { success: false };
  let listData = block.listData;

  // All lists use parent/child structure - move blocks between parents
  if (listData.depth === 1) {
    let run = async () => {
      await rep?.mutate.assertFact({
        entity: block.entityID,
        attribute: "block/is-list",
        data: { type: "boolean", value: false },
      });
      await rep?.mutate.moveChildren({
        oldParent: block.entityID,
        newParent: block.parent,
        after: block.entityID,
      });
    };
    if (undoManager) await undoManager.withUndoGroup(run);
    else await run();
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
    unfoldBlocks(rep, [parent]);
    await rep?.mutate.outdentBlock({
      block: block.entityID,
      newParent: parent,
      oldParent: listData.parent,
      after,
      excludeFromSiblings,
    });

    return { success: true };
  }
}

export async function multiSelectIndent(
  sortedSelection: Block[],
  siblings: Block[],
  rep: Replicache<ReplicacheMutators>,
  undoManager?: UndoManager,
): Promise<void> {
  let run = async () => {
    for (let i = 0; i < siblings.length; i++) {
      let block = siblings[i];
      if (!sortedSelection.find((s) => s.entityID === block.entityID)) continue;
      // A block whose list parent is also selected rides along with it.
      if (sortedSelection.find((s) => s.entityID === block.listData?.parent))
        continue;
      let parentoffset = 1;
      let previousBlock = siblings[i - parentoffset];
      while (
        previousBlock &&
        sortedSelection.find((s) => previousBlock.entityID === s.entityID)
      ) {
        parentoffset += 1;
        previousBlock = siblings[i - parentoffset];
      }
      if (!block.listData || !previousBlock?.listData) continue;
      await indent(block, previousBlock, rep);
    }
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}

// All-or-nothing rather than a per-block flip: on a mixed selection the user is
// reaching for "make these a list", not "invert each one".
export async function toggleListForBlocks(
  blocks: Block[],
  rep?: Replicache<ReplicacheMutators> | null,
  undoManager?: UndoManager,
) {
  if (!rep || blocks.length === 0) return;
  let allLists = blocks.every((b) => !!b.listData);
  let run = async () => {
    for (let block of blocks) {
      if (allLists) {
        await outdentFull(block, rep);
      } else if (!block.listData) {
        await rep.mutate.assertFact({
          entity: block.entityID,
          attribute: "block/is-list",
          data: { type: "boolean", value: true },
        });
      }
    }
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}

export async function setListStyleForBlocks(
  blocks: Block[],
  style: "ordered" | "unordered",
  rep?: Replicache<ReplicacheMutators> | null,
  undoManager?: UndoManager,
) {
  if (!rep) return;
  let run = async () => {
    for (let block of blocks) {
      if (style === "ordered") orderListItems(block, rep);
      else unorderListItems(block, rep);
    }
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}

export async function toggleChecklistForBlocks(
  blocks: Block[],
  rep?: Replicache<ReplicacheMutators> | null,
  undoManager?: UndoManager,
) {
  if (!rep) return;
  let listBlocks = blocks.filter((b) => !!b.listData);
  if (listBlocks.length === 0) return;
  let allChecklists = listBlocks.every((b) => b.listData?.checklist);
  let run = async () => {
    for (let block of listBlocks) {
      if (allChecklists)
        await rep.mutate.retractAttribute({
          entity: block.entityID,
          attribute: "block/check-list",
        });
      else if (!block.listData?.checklist)
        await rep.mutate.assertFact({
          entity: block.entityID,
          attribute: "block/check-list",
          data: { type: "boolean", value: false },
        });
    }
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}

export async function multiSelectOutdent(
  sortedSelection: Block[],
  siblings: Block[],
  rep: Replicache<ReplicacheMutators>,
  undoManager?: UndoManager,
): Promise<void> {
  let pageParent = siblings[0]?.parent;
  if (!pageParent) return;

  let selectedSet = new Set(sortedSelection.map((b) => b.entityID));
  let selectedEntities = sortedSelection.map((b) => b.entityID);

  // Check if all selected list items are at depth 1 → convert to text
  let allAtDepth1 = sortedSelection.every(
    (b) => !b.listData || b.listData.depth === 1,
  );

  let run = async () => {
    if (allAtDepth1) {
      // Convert depth-1 items to plain text (outdent handles this)
      for (let i = siblings.length - 1; i >= 0; i--) {
        let block = siblings[i];
        if (!selectedSet.has(block.entityID)) continue;
        if (!block.listData) continue;
        await outdent(block, null, rep, selectedEntities);
      }
    } else {
      // Normal outdent: iterate backward through siblings
      for (let i = siblings.length - 1; i >= 0; i--) {
        let block = siblings[i];
        if (!selectedSet.has(block.entityID)) continue;
        if (!block.listData) continue;
        if (block.listData.depth === 1) continue;

        // Skip if parent is selected AND parent's depth > 1
        let parentEntity = block.listData.parent;
        if (selectedSet.has(parentEntity)) {
          let parentBlock = siblings.find((s) => s.entityID === parentEntity);
          if (parentBlock?.listData && parentBlock.listData.depth > 1) continue;
        }

        await outdent(block, null, rep, selectedEntities);
      }
    }
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}
