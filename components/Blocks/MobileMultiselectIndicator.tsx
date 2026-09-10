"use client";

import { useEntitySetContext } from "components/EntitySetProvider";
import { CheckboxChecked } from "components/Icons/CheckboxChecked";
import { CheckboxEmpty } from "components/Icons/CheckboxEmpty";
import { useIsMobile } from "src/hooks/isMobile";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";

type IndicatorState = "available" | "selected" | null;

// Mobile has no shift-click or drag-select, so a small tab on the left edge of
// each block is how the user reaches multi-select. It shows once there's a
// selection to extend: text selected in a text block, a non-text block
// selected (tap or long press), or a multi-select already in progress.
export function useMobileMultiselectIndicator(block: {
  entityID: string;
  parent: string;
}): IndicatorState {
  let isMobile = useIsMobile();
  let { permissions } = useEntitySetContext();

  // Packed into one primitive so the store only re-renders this block when its
  // own indicator changes. The "single:<id>" case still needs the focused
  // block's editor state (below) to tell a text selection from a bare caret.
  let mode = useUIState((s) => {
    if (s.selectedBlocks.length > 1) {
      if (s.selectedBlocks[0].parent !== block.parent) return null;
      return s.selectedBlocks.some((b) => b.entityID === block.entityID)
        ? "selected"
        : "available";
    }
    let focused = s.focusedEntity;
    if (
      !focused ||
      focused.entityType !== "block" ||
      focused.parent !== block.parent ||
      focused.entityID === block.entityID
    )
      return null;
    if (
      s.selectedBlocks.length !== 1 ||
      s.selectedBlocks[0].entityID !== focused.entityID
    )
      return null;
    return `single:${focused.entityID}`;
  });

  let singleFocused = mode?.startsWith("single:") ? mode.slice(7) : null;
  // A mounted text editor always has an entry here, so no entry means the
  // focused block is a non-text block, which counts as selected on its own.
  let singleActive = useEditorStates((s) => {
    if (!singleFocused) return false;
    let editorState = s.editorStates[singleFocused];
    if (!editorState) return true;
    return !editorState.editor.selection.empty;
  });

  if (!isMobile || !permissions.write) return null;
  if (mode === "selected" || mode === "available") return mode;
  return singleActive ? "available" : null;
}

export const MobileMultiselectIndicator = (props: {
  entityID: string;
  parent: string;
}) => {
  let state = useMobileMultiselectIndicator(props);
  if (!state) return null;
  let selected = state === "selected";

  return (
    <button
      aria-label={selected ? "Remove from selection" : "Add to selection"}
      aria-pressed={selected}
      className="mobileMultiselectIndicator absolute left-0 top-0 z-10 flex h-9 w-8 items-start pt-1.5"
      // Swallow the press so the block wrapper's tap/long-press/swipe handlers
      // don't run, and the focused editor keeps its selection until we're done.
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        let ui = useUIState.getState();
        if (selected) {
          ui.removeBlockFromSelection({ entityID: props.entityID });
          let remaining = useUIState.getState().selectedBlocks;
          if (
            remaining.length === 1 &&
            remaining[0].entityID !== ui.focusedEntity?.entityID
          )
            ui.focusAndSelectBlock(remaining[0]);
          return;
        }
        ui.addBlockToSelection({
          entityID: props.entityID,
          parent: props.parent,
        });
        // The multiselect toolbar replaces the text toolbar, so drop the soft
        // keyboard to make room for the blocks being selected.
        (document.activeElement as HTMLElement | null)?.blur?.();
      }}
    >
      <span
        className={`flex h-6 w-[18px] items-center justify-center rounded-r-full pl-[2px] text-bg-page ${
          selected ? "bg-accent-contrast" : "bg-border"
        }`}
      >
        {selected ? <CheckboxChecked /> : <CheckboxEmpty />}
      </span>
    </button>
  );
};
