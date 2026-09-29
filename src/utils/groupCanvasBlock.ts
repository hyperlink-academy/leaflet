import { generateKeyBetween } from "fractional-indexing";
import type { Replicache } from "replicache";
import { v7 } from "uuid";
import type { Fact, ReplicacheMutators } from "src/replicache";
import type { UndoManager } from "src/undoManager";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";

// One undo entry that ungroups in a single mutation: undoing fact by fact
// would render in-between states, like the canvas pointing at a typeless group.
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

async function groupCanvasBlockAndAdd(
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
  side: "above" | "below",
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
    // Beside the group's first child, which sits at
    // generateKeyBetween(null, null).
    position:
      side === "above"
        ? generateKeyBetween(null, generateKeyBetween(null, null))
        : generateKeyBetween(generateKeyBetween(null, null), null),
    list: args.list,
  });
  return groupEntity;
}

type AddArgs = Parameters<typeof groupCanvasBlockAndAdd>[2];

export const groupCanvasBlockAndAddBelow = (
  rep: Replicache<ReplicacheMutators>,
  undoManager: UndoManager,
  args: AddArgs,
) => groupCanvasBlockAndAdd(rep, undoManager, args, "below");

export const groupCanvasBlockAndAddAbove = (
  rep: Replicache<ReplicacheMutators>,
  undoManager: UndoManager,
  args: AddArgs,
) => groupCanvasBlockAndAdd(rep, undoManager, args, "above");
