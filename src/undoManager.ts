import { UndoManager as RociUndoManager } from "@rocicorp/undo";

export type UndoManager = ReturnType<typeof createUndoManager>;
export const createUndoManager = () => {
  let isGrouping = false;
  let undoManager = new RociUndoManager({
    onChange: (state) => {},
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
