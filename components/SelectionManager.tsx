"use client";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { scanIndex } from "src/replicache/utils";
import { useEditorStates } from "./TextBlock";
export const useSelectingMouse = create(() => ({
  start: null as null | { top: number; left: number },
}));

//How should I model selection? As ranges w/ a start and end? Store *blocks* so that I can just construct ranges?
// How does this relate to *when dragging* ?

export function SelectionManager() {
  let moreThanOneSelected = useUIState((s) => s.selectedBlock.length > 1);
  let { rep } = useReplicache();
  useEffect(() => {
    let listener = async (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        if (moreThanOneSelected) {
          for (let block of useUIState.getState().selectedBlock) {
            useUIState.getState().closeCard(block.value);
            await rep?.mutate.removeBlock({ blockEntity: block.value });
          }
        }
      }
      if (e.key === "Escape") {
        useUIState.setState(() => ({ focusedBlock: null, selectedBlock: [] }));
      }
      if (e.key === "ArrowUp") {
        if (e.defaultPrevented) return;
        let selectedBlocks = useUIState
          .getState()
          .selectedBlock.sort((a, b) => (a.position > b.position ? 1 : -1));
        let focusedBlock = useUIState.getState().focusedBlock;
        if (e.shiftKey) {
          if (
            selectedBlocks.length <= 1 ||
            !focusedBlock ||
            focusedBlock.type === "card"
          )
            return;
          let b = focusedBlock;
          let focusedBlockIndex = selectedBlocks.findIndex(
            (s) => s.value == b.entityID,
          );
          let siblings =
            (await rep?.query((tx) =>
              scanIndex(tx).eav(b.parent, "card/block"),
            )) || [];
          let sortedSiblings = siblings.sort((a, b) =>
            a.data.position > b.data.position ? 1 : -1,
          );
          if (focusedBlockIndex === 0) {
            let index = sortedSiblings.findIndex(
              (s) => s.data.value === b.entityID,
            );
            let nextSelectedBlock = sortedSiblings[index - 1];
            if (!nextSelectedBlock) return;

            let nextSelectedBlockType = await rep?.query((tx) =>
              scanIndex(tx).eav(nextSelectedBlock.data.value, "block/type"),
            );
            if (!nextSelectedBlockType?.[0]) return;
            useUIState.getState().addBlockToSelection({
              ...nextSelectedBlock.data,
              type: nextSelectedBlockType[0].data.value,
            });
            useUIState.getState().setFocusedBlock({
              type: "block",
              parent: nextSelectedBlock.entity,
              entityID: nextSelectedBlock.data.value,
            });
          } else {
            let nextBlock = selectedBlocks[selectedBlocks.length - 2];
            useUIState.getState().setFocusedBlock({
              type: "block",
              parent: b.parent,
              entityID: nextBlock.value,
            });
            if (selectedBlocks.length === 2) {
              useEditorStates
                .getState()
                .editorStates[nextBlock.value]?.view?.focus();
            }
            useUIState
              .getState()
              .removeBlockFromSelection(selectedBlocks[focusedBlockIndex]);
          }
        }
      }
      if (e.key === "ArrowDown") {
        if (e.defaultPrevented) return;
        let selectedBlocks = useUIState
          .getState()
          .selectedBlock.sort((a, b) => (a.position > b.position ? 1 : -1));
        let focusedBlock = useUIState.getState().focusedBlock;
        if (e.shiftKey) {
          if (
            selectedBlocks.length <= 1 ||
            !focusedBlock ||
            focusedBlock.type === "card"
          )
            return;
          let b = focusedBlock;
          let focusedBlockIndex = selectedBlocks.findIndex(
            (s) => s.value == b.entityID,
          );
          let siblings =
            (await rep?.query((tx) =>
              scanIndex(tx).eav(b.parent, "card/block"),
            )) || [];
          let sortedSiblings = siblings.sort((a, b) =>
            a.data.position > b.data.position ? 1 : -1,
          );
          if (focusedBlockIndex === selectedBlocks.length - 1) {
            let index = sortedSiblings.findIndex(
              (s) => s.data.value === b.entityID,
            );
            let nextSelectedBlock = sortedSiblings[index + 1];
            if (!nextSelectedBlock) return;
            let nextSelectedBlockType = await rep?.query((tx) =>
              scanIndex(tx).eav(nextSelectedBlock.data.value, "block/type"),
            );
            if (!nextSelectedBlockType?.[0]) return;
            useUIState.getState().addBlockToSelection({
              ...nextSelectedBlock.data,
              type: nextSelectedBlockType[0].data.value,
            });
            useUIState.getState().setFocusedBlock({
              type: "block",
              parent: nextSelectedBlock.entity,
              entityID: nextSelectedBlock.data.value,
            });
          } else {
            let nextBlock = selectedBlocks[1];
            useUIState
              .getState()
              .removeBlockFromSelection({ value: b.entityID });
            useUIState.getState().setFocusedBlock({
              type: "block",
              parent: b.parent,
              entityID: nextBlock.value,
            });
            if (selectedBlocks.length === 2) {
              useEditorStates
                .getState()
                .editorStates[nextBlock.value]?.view?.focus();
            }
          }
        }
      }
      if ((e.key === "c" && e.metaKey) || e.ctrlKey) {
        if (!rep) return;
        let selectedBlocks = useUIState.getState().selectedBlock;
        let html = await getBlocksAsHTML(rep, selectedBlocks);
        const type = "text/html";
        const blob = new Blob([html.join("\n")], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        await navigator.clipboard.write(data);
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
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
