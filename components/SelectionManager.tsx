"use client";
import { useEffect, useRef } from "react";
import { useUIState } from "app/[doc_id]/Blocks";
import { create } from "zustand";
export const useSelectingMouse = create(() => ({
  start: null as null | { top: number; left: number },
}));

export function SelectionManager() {
  let moreThanOneSelected = useUIState((s) => s.selectedBlock.length > 1);
  useEffect(() => {
    if (moreThanOneSelected) {
      (document.activeElement as HTMLElement | null)?.blur();
      window.getSelection()?.removeAllRanges();
    }
  }, [moreThanOneSelected]);
  let dragStart = useSelectingMouse((s) => s.start);
  let initialContentEditableParent = useRef<null | Node>(null);
  let savedSelection = useRef<Range[] | null>();
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
        }, 10);
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
function saveSelection() {
  let selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    let ranges: Range[] = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      ranges.push(selection.getRangeAt(i));
    }
    return ranges;
  }
  return [];
}
function restoreSelection(savedRanges: Range[]) {
  if (savedRanges) {
    let selection = window.getSelection() || new Selection();
    selection.removeAllRanges();
    for (let i = 0; i < savedRanges.length; i++) {
      selection.addRange(savedRanges[i]);
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
