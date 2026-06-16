import { UndoManager as RociUndoManager } from "@rocicorp/undo";
import { create } from "zustand";

export type UndoManager = ReturnType<typeof createUndoManager>;
export const useUndoState = create(() => ({ canUndo: false, canRedo: false }));

// A run of typing coalesces into one undo step until the user pauses for this
// long. The timer resets on every keystroke, so only an actual gap between
// keystrokes ends a run.
const COALESCE_MS = 500;

type Op = { undo: () => Promise<void> | void; redo: () => Promise<void> | void };

export const createUndoManager = () => {
  let undoManager = new RociUndoManager({
    onChange: (state) => {
      useUndoState.setState(state);
    },
  });

  // @rocicorp/undo allows only one group open at a time. Two kinds of producer
  // share this single instance — explicit command groups (Tab/Enter/Backspace
  // via startGroup/withUndoGroup) and coalescing text-edit groups (addGrouped) —
  // so all grouping state is owned here to keep them from closing each other's
  // groups (which previously split a multi-mutation op across boundaries and
  // orphaned blocks on undo).
  //
  // Command groups are *lazy*: startGroup only records intent (groupDepth++);
  // nothing touches the underlying @rocicorp/undo group or the in-progress
  // typing run until the command records its first entry (see openCommandGroup).
  // This matters because SelectionManager wraps EVERY keystroke in withUndoGroup
  // — it only learns which key it handles once inside the callback — so a plain
  // character opens a command group on every keystroke. If that eagerly flushed
  // the coalescing run, typing would undo char by char. A no-op command records
  // nothing and leaves the run untouched; a real command flushes it and becomes
  // its own step.
  let groupDepth = 0; // open command groups (counted so nesting is safe)
  let commandGroupOpen = false; // the raw command group has been materialized
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
  // Materialize the command group on its first recorded entry: flush any
  // in-progress typing (so the command is its own undo step) and open the single
  // raw @rocicorp/undo group that every entry until endGroup will join.
  let openCommandGroup = () => {
    if (commandGroupOpen) return;
    flushCoalesce();
    undoManager.startGroup();
    commandGroupOpen = true;
  };

  let um = {
    add: (args: Op) => {
      // Inside a command group, the first entry materializes it (flushing any
      // adjacent typing) so all of the command's mutations undo as one step.
      if (groupDepth > 0) openCommandGroup();
      undoManager.add(args);
    },
    // Record intent to group. The raw group opens lazily (see openCommandGroup)
    // only once the command actually records something, so wrapping a no-op
    // keystroke never disturbs the typing run. Safe to nest.
    startGroup: () => {
      groupDepth++;
    },
    endGroup: () => {
      if (groupDepth === 0) return;
      groupDepth--;
      if (groupDepth === 0 && commandGroupOpen) {
        undoManager.endGroup();
        commandGroupOpen = false;
      }
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
    // key — or a lapsed window — starts a fresh group. While a *materialized*
    // command group is open the edit just joins it (e.g. the Enter handler's
    // block split, marked externalUndoGroup, lands in the command's step). A
    // merely-pending command group (a no-op keystroke wrapper) does not divert
    // the edit, so it keeps coalescing with the rest of the typing run.
    addGrouped: (args: Op, coalesceKey?: string) => {
      if (commandGroupOpen) {
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
