import { UndoManager as RociUndoManager } from "@rocicorp/undo";
import { create } from "zustand";

export type UndoManager = ReturnType<typeof createUndoManager>;
export const useUndoState = create(() => ({ canUndo: false, canRedo: false }));

// Consecutive text edits within this window coalesce into one undo step.
const COALESCE_MS = 200;

type Op = { undo: () => Promise<void> | void; redo: () => Promise<void> | void };

export const createUndoManager = () => {
  let undoManager = new RociUndoManager({
    onChange: (state) => {
      useUndoState.setState(state);
    },
  });

  // @rocicorp/undo allows only one group open at a time. Three producers share
  // this single instance — explicit command groups (Tab/Enter/Backspace via
  // startGroup/withUndoGroup) and coalescing text-edit groups (addGrouped) —
  // so all grouping state is owned here to keep them from closing each other's
  // groups (which previously split a multi-mutation op across boundaries and
  // orphaned blocks on undo).
  let groupDepth = 0; // open explicit command groups (counted so nesting is safe)
  let coalesceOpen = false; // a text-edit coalescing group is open
  let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
  // Serialize undo/redo so rapid keypresses don't re-enter @rocicorp/undo's
  // recursive group walk (it mutates a shared index) and corrupt the stack.
  let opChain: Promise<void> = Promise.resolve();

  let clearCoalesceTimer = () => {
    if (coalesceTimer !== null) {
      clearTimeout(coalesceTimer);
      coalesceTimer = null;
    }
  };
  // Finalize the open coalescing text group, if any.
  let flushCoalesce = () => {
    clearCoalesceTimer();
    if (coalesceOpen) {
      coalesceOpen = false;
      undoManager.endGroup();
    }
  };

  let um = {
    add: (args: Op) => {
      undoManager.add(args);
    },
    // Open an atomic command group. Finalizes any pending text-edit group first
    // so a command never merges with adjacent typing, and opens only one raw
    // group regardless of nesting depth.
    startGroup: () => {
      flushCoalesce();
      if (groupDepth === 0) undoManager.startGroup();
      groupDepth++;
    },
    endGroup: () => {
      if (groupDepth === 0) return;
      groupDepth--;
      if (groupDepth === 0) undoManager.endGroup();
    },
    withUndoGroup: <T>(cb: () => T): T => {
      um.startGroup();
      let end = () => um.endGroup();
      let r: T;
      try {
        r = cb();
      } catch (e) {
        end();
        throw e;
      }
      // Hold the group open until an async command settles so all its mutations
      // (whose undoManager.add calls run as the awaited mutators execute) land
      // in this group.
      if (r instanceof Promise) return r.finally(end) as T;
      end();
      return r;
    },
    // Add a text edit, coalescing consecutive edits within COALESCE_MS. If a
    // command group is open the edit just joins it.
    addGrouped: (args: Op) => {
      if (groupDepth > 0) {
        undoManager.add(args);
        return;
      }
      if (!coalesceOpen) {
        undoManager.startGroup();
        coalesceOpen = true;
      }
      undoManager.add(args);
      clearCoalesceTimer();
      coalesceTimer = setTimeout(flushCoalesce, COALESCE_MS);
    },
    // Finalize the open coalescing group immediately (e.g. on blur).
    flushGroup: () => {
      flushCoalesce();
    },
    undo: () => {
      flushCoalesce();
      opChain = opChain.then(() => undoManager.undo()).then(
        () => {},
        () => {},
      );
      return opChain;
    },
    redo: () => {
      flushCoalesce();
      opChain = opChain.then(() => undoManager.redo()).then(
        () => {},
        () => {},
      );
      return opChain;
    },
  };
  return um;
};
