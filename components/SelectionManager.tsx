"use client";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
export const useSelectingMouse = create(() => ({
  start: null as null | { top: number; left: number },
}));

export function SelectionManager() {
  let moreThanOneSelected = useUIState((s) => s.selectedBlock.length > 1);
  let { rep } = useReplicache();
  useEffect(() => {
    if (moreThanOneSelected) {
      let listener = async (e: KeyboardEvent) => {
        if (e.key === "Backspace" || e.key === "Delete") {
          for (let entity of useUIState.getState().selectedBlock) {
            await rep?.mutate.removeBlock({ blockEntity: entity });
          }
        }
      };
      window.addEventListener("keydown", listener);
      return () => {
        window.removeEventListener("keydown", listener);
      };
    }
  }, [moreThanOneSelected, rep]);
  let dragStart = useSelectingMouse((s) => s.start);
  let initialContentEditableParent = useRef<null | Node>(null);
  let savedSelection = useRef<SavedRange[] | null>();
  useEffect(() => {
    let mouseDownListener = (e: MouseEvent) => {
      initialContentEditableParent.current = getContentEditableParent(
        e.target as Node,
      );
      useSelectingMouse.setState({
        start: { left: e.clientX, top: e.clientY },
      });
    };
    let mouseUpListener = (e: MouseEvent) => {
      e.preventDefault();
      if (
        initialContentEditableParent.current &&
        getContentEditableParent(e.target as Node) !==
          initialContentEditableParent.current
      ) {
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
        }, 5);
      }
      savedSelection.current = null;
      useSelectingMouse.setState({ start: null });
    };
    window.addEventListener("mousedown", mouseDownListener);
    window.addEventListener("mouseup", mouseUpListener);
    return () => {
      window.removeEventListener("mousedown", mouseDownListener);
      window.removeEventListener("mouseup", mouseUpListener);
    };
  }, []);
  useEffect(() => {
    if (!dragStart) return;
    let mouseMoveListener = (e: MouseEvent) => {
      if (e.buttons !== 1) return;
      if (initialContentEditableParent.current) {
        if (
          initialContentEditableParent.current ===
          getContentEditableParent(e.target as Node)
        ) {
          if (savedSelection.current) {
            restoreSelection(savedSelection.current);
          }
          savedSelection.current = null;
          return;
        }
        if (!savedSelection.current) savedSelection.current = saveSelection();
      }
      window.getSelection()?.removeAllRanges();
    };
    window.addEventListener("mousemove", mouseMoveListener);
    return () => {
      window.removeEventListener("mousemove", mouseMoveListener);
    };
  }, [dragStart]);
  return null;
}

type SavedRange = {
  startContainer: Node;
  startOffset: number;
  endContainer: Node;
  endOffset: number;
  direction: "forward" | "backward";
};
export function saveSelection() {
  let selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    let ranges: SavedRange[] = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      let range = selection.getRangeAt(i);
      ranges.push({
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        direction:
          selection.anchorNode === range.startContainer &&
          selection.anchorOffset === range.startOffset
            ? "forward"
            : "backward",
      });
    }
    return ranges;
  }
  return [];
}

export function restoreSelection(savedRanges: SavedRange[]) {
  if (savedRanges && savedRanges.length > 0) {
    let selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    for (let i = 0; i < savedRanges.length; i++) {
      let range = document.createRange();
      range.setStart(savedRanges[i].startContainer, savedRanges[i].startOffset);
      range.setEnd(savedRanges[i].endContainer, savedRanges[i].endOffset);

      selection.addRange(range);

      // If the direction is backward, collapse the selection to the end and then extend it backward
      if (savedRanges[i].direction === "backward") {
        selection.collapseToEnd();
        selection.extend(
          savedRanges[i].startContainer,
          savedRanges[i].startOffset,
        );
      }
    }
  }
}

function getContentEditableParent(e: Node | null): Node | null {
  let element: Node | null = e;
  while (element && element !== document) {
    if ((element as HTMLElement).contentEditable === "true") {
      return element;
    }
    element = element.parentNode;
  }
  return null;
}
