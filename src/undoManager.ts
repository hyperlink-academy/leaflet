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
    withUndoGroup: <T>(cb: () => T) => {
      if (!isGrouping) um.startGroup();
      const r = cb();
      if (!isGrouping) um.endGroup();
      return r;
    },
  };
  return um;
};
