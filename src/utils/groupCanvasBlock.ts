import { generateKeyBetween } from "fractional-indexing";
import type { Replicache } from "replicache";
import { v7 } from "uuid";
import type { Fact, ReplicacheMutators } from "src/replicache";
import type { UndoManager } from "src/undoManager";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";

// Makes a lone canvas block the first block of a group, so blocks can follow
// it as in a linear document. Grouping is one undo entry that ungroups in a
// single mutation: undoing it fact by fact would render the states in
// between, like the canvas pointing at a group whose type is already gone.
export async function groupCanvasBlock(
  rep: Replicache<ReplicacheMutators>,
  undoManager: UndoManager,
  args: {
    page: string;
    blockEntity: string;
    groupEntity: string;
    permission_set: string;
  },
) {
  // Moving into the group remounts the block's editor on a fresh yjs doc
  // seeded from block/text, so persist pending edits first or the remounted
  // block briefly shows stale text.
  await flushPendingTextWrites();
  let mutationArgs = { ...args, childFactID: v7(), ignoreUndo: true as const };
  await rep.mutate.groupCanvasBlock(mutationArgs);
  undoManager.add({
    undo: () =>
      rep.mutate.ungroupCanvasBlock({
        page: args.page,
        blockEntity: args.blockEntity,
        groupEntity: args.groupEntity,
        ignoreUndo: true,
      }),
    redo: () => rep.mutate.groupCanvasBlock(mutationArgs),
  });
}

// Groups a lone canvas block and adds a new block after it in the group.
// Returns the group entity.
export async function groupCanvasBlockAndAddBelow(
  rep: Replicache<ReplicacheMutators>,
  undoManager: UndoManager,
  args: {
    page: string;
    blockEntity: string;
    newEntityID: string;
    permission_set: string;
    type: Fact<"block/type">["data"]["value"];
    list?: {
      listStyle?: Fact<"block/list-style">["data"]["value"];
      checklist?: boolean;
    };
  },
) {
  let groupEntity = v7();
  await groupCanvasBlock(rep, undoManager, {
    page: args.page,
    blockEntity: args.blockEntity,
    groupEntity,
    permission_set: args.permission_set,
  });
  await rep.mutate.addBlock({
    newEntityID: args.newEntityID,
    factID: v7(),
    permission_set: args.permission_set,
    parent: groupEntity,
    type: args.type,
    // After the group's first child, which sits at generateKeyBetween(null, null).
    position: generateKeyBetween(generateKeyBetween(null, null), null),
    list: args.list,
  });
  return groupEntity;
}
