import { UndoManager as RociUndoManager } from "@rocicorp/undo";
import { create } from "zustand";

export type UndoManager = ReturnType<typeof createUndoManager>;
export const useUndoState = create(() => ({ canUndo: false, canRedo: false }));
export const createUndoManager = () => {
  let isGrouping = false;
  let undoManager = new RociUndoManager({
    onChange: (state) => {
      useUndoState.setState(state);
    },
  });
  let um = {
    add: (args: {
      undo: () => Promise<void> | void;
      redo: () => Promise<void> | void;
    }) => {
      undoManager.add(args);
    },
    startGroup: (groupName?: string) => {
      if (isGrouping) {
        undoManager.endGroup();
      }
      isGrouping = true;
      undoManager.startGroup();
    },
    endGroup: () => {
      isGrouping = false;
      undoManager.endGroup();
    },
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
    withUndoGroup: <T>(cb: () => T): T => {
      const wasGrouping = isGrouping;
      if (!wasGrouping) um.startGroup();
      const endIfOwner = () => {
        if (!wasGrouping) um.endGroup();
      };
      let r: T;
      try {
        r = cb();
      } catch (e) {
        endIfOwner();
        throw e;
      }
      // Replicache mutator bodies — and the undoManager.add calls they make —
      // run asynchronously, after the callback's synchronous portion returns.
      // If the callback is async, hold the group open until it settles so those
      // mutations land in this group instead of as separate undo entries.
      if (r instanceof Promise) return r.finally(endIfOwner) as T;
      endIfOwner();
      return r;
    },
  };
  return um;
};
