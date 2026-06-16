import { UndoManager as RociUndoManager } from "@rocicorp/undo";
import { create } from "zustand";

export type UndoManager = ReturnType<typeof createUndoManager>;
export const useUndoState = create(() => ({ canUndo: false, canRedo: false }));

// A run of typing coalesces into one undo step until the user pauses for this
// long (the timer resets on every keystroke, so only an actual gap between
// keystroke ends a run). 200ms was short enough that any normal-paced gap
// (typing slower than ~5 cps) flushed between keystrokes, undoing char by char.
const COALESCE_MS = 500;

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
  let currentCoalesceKey: string | undefined; // span key of the open group
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
      currentCoalesceKey = undefined;
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
    // Add a text edit that coalesces with adjacent edits sharing the same span
    // key (e.g. the block/footnote entityID) within COALESCE_MS. A different
    // key — or a lapsed window — starts a fresh group; an open command group
    // (groupDepth > 0) just absorbs the edit.
    addGrouped: (args: Op, coalesceKey?: string) => {
      if (groupDepth > 0) {
        undoManager.add(args);
        return;
      }
      // A different span finalizes the open group now, independent of the
      // timer, so edits to two different spans never merge into one undo step.
      if (coalesceOpen && coalesceKey !== currentCoalesceKey) flushCoalesce();
      if (!coalesceOpen) {
        undoManager.startGroup();
        coalesceOpen = true;
        currentCoalesceKey = coalesceKey;
      }
      undoManager.add(args);
      clearCoalesceTimer();
      coalesceTimer = setTimeout(flushCoalesce, COALESCE_MS);
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
