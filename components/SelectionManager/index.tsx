"use client";
import { useEffect, useRef, useState } from "react";
import { useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { scanIndex } from "src/replicache/utils";
import { focusBlock } from "src/utils/focusBlock";
import { useEditorStates } from "src/state/useEditorState";
import { useEntitySetContext } from "../EntitySetProvider";
import { getBlocksWithType } from "src/replicache/getBlocks";
import { indent, outdentFull, multiSelectOutdent } from "src/utils/list-operations";
import { addShortcut, Shortcut } from "src/shortcuts";
import { elementId } from "src/utils/elementId";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";
import { copySelection } from "src/utils/copySelection";
import { useIsMobile } from "src/hooks/isMobile";
import { deleteBlock } from "src/utils/deleteBlock";
import { schema } from "../Blocks/TextBlock/schema";
import { MarkType } from "prosemirror-model";
import { useSelectingMouse, getSortedSelection } from "./selectionState";
import { moveBlockUp, moveBlockDown } from "src/utils/moveBlock";

//How should I model selection? As ranges w/ a start and end? Store *blocks* so that I can just construct ranges?
// How does this relate to *when dragging* ?

export function SelectionManager() {
  let moreThanOneSelected = useUIState((s) => s.selectedBlocks.length > 1);
  let entity_set = useEntitySetContext();
  let { rep, undoManager } = useReplicache();
  let isMobile = useIsMobile();
  useEffect(() => {
    if (!entity_set.permissions.write || !rep) return;
    const getSortedSelectionBound = getSortedSelection.bind(null, rep);
    let shortcuts: Shortcut[] = [
      {
        metaKey: true,
        key: "ArrowUp",
        handler: async () => {
          let [firstBlock] =
            (await rep?.query((tx) =>
              getBlocksWithType(
                tx,
                useUIState.getState().selectedBlocks[0].parent,
              ),
            )) || [];
          if (firstBlock) focusBlock(firstBlock, { type: "start" });
        },
      },
      {
        metaKey: true,
        key: "ArrowDown",
        handler: async () => {
          let blocks =
            (await rep?.query((tx) =>
              getBlocksWithType(
                tx,
                useUIState.getState().selectedBlocks[0].parent,
              ),
            )) || [];
          let folded = useUIState.getState().foldedBlocks;
          blocks = blocks.filter(
            (f) =>
              !f.listData ||
              !f.listData.path.find(
                (path) =>
                  folded.includes(path.entity) && f.value !== path.entity,
              ),
          );
          let lastBlock = blocks[blocks.length - 1];
          if (lastBlock) focusBlock(lastBlock, { type: "end" });
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["l", "¬"],
        handler: async () => {
          let [sortedBlocks, siblings] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            if (!block.listData) {
              await rep?.mutate.assertFact({
                entity: block.value,
                attribute: "block/is-list",
                data: { type: "boolean", value: true },
              });
            } else {
              outdentFull(block, rep);
            }
          }
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["1", "¡"],
        handler: async () => {
          let [sortedBlocks] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/heading-level",
              data: { type: "number", value: 1 },
            });
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/type",
              data: { type: "block-type-union", value: "heading" },
            });
          }
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["2", "™"],
        handler: async () => {
          let [sortedBlocks] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/heading-level",
              data: { type: "number", value: 2 },
            });
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/type",
              data: { type: "block-type-union", value: "heading" },
            });
          }
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["3", "£"],
        handler: async () => {
          let [sortedBlocks] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/heading-level",
              data: { type: "number", value: 3 },
            });
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/type",
              data: { type: "block-type-union", value: "heading" },
            });
          }
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["0", "º"],
        handler: async () => {
          let [sortedBlocks] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            // Convert to text block
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/type",
              data: { type: "block-type-union", value: "text" },
            });
            // Remove heading level if exists
            let headingLevel = await rep?.query((tx) =>
              scanIndex(tx).eav(block.value, "block/heading-level"),
            );
            if (headingLevel?.[0]) {
              await rep?.mutate.retractFact({ factID: headingLevel[0].id });
            }
            // Remove text-size to make it default
            let textSizeFact = await rep?.query((tx) =>
              scanIndex(tx).eav(block.value, "block/text-size"),
            );
            if (textSizeFact?.[0]) {
              await rep?.mutate.retractFact({ factID: textSizeFact[0].id });
            }
          }
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["+", "≠"],
        handler: async () => {
          let [sortedBlocks] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            // Convert to text block
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/type",
              data: { type: "block-type-union", value: "text" },
            });
            // Remove heading level if exists
            let headingLevel = await rep?.query((tx) =>
              scanIndex(tx).eav(block.value, "block/heading-level"),
            );
            if (headingLevel?.[0]) {
              await rep?.mutate.retractFact({ factID: headingLevel[0].id });
            }
            // Set text size to large
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/text-size",
              data: { type: "text-size-union", value: "large" },
            });
          }
        },
      },
      {
        metaKey: true,
        altKey: true,
        key: ["-", "–"],
        handler: async () => {
          let [sortedBlocks] = await getSortedSelectionBound();
          for (let block of sortedBlocks) {
            // Convert to text block
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/type",
              data: { type: "block-type-union", value: "text" },
            });
            // Remove heading level if exists
            let headingLevel = await rep?.query((tx) =>
              scanIndex(tx).eav(block.value, "block/heading-level"),
            );
            if (headingLevel?.[0]) {
              await rep?.mutate.retractFact({ factID: headingLevel[0].id });
            }
            // Set text size to small
            await rep?.mutate.assertFact({
              entity: block.value,
              attribute: "block/text-size",
              data: { type: "text-size-union", value: "small" },
            });
          }
        },
      },
      {
        metaKey: true,
        shift: true,
        key: ["ArrowDown", "J"],
        handler: async () => {
          if (!rep) return;
          await moveBlockDown(rep, entity_set.set);
        },
      },
      {
        metaKey: true,
        shift: true,
        key: ["ArrowUp", "K"],
        handler: async () => {
          if (!rep) return;
          await moveBlockUp(rep);
        },
      },

      {
        metaKey: true,
        shift: true,
        key: "Enter",
        handler: async () => {
          let [sortedBlocks, siblings] = await getSortedSelectionBound();
          if (!sortedBlocks[0].listData) return;
          useUIState.getState().toggleFold(sortedBlocks[0].value);
        },
      },
    ];
    if (moreThanOneSelected)
      shortcuts = shortcuts.concat([
        {
          metaKey: true,
          key: "u",
          handler: async () => {
            let [sortedBlocks] = await getSortedSelectionBound();
            toggleMarkInBlocks(
              sortedBlocks.filter((b) => b.type === "text").map((b) => b.value),
              schema.marks.underline,
            );
          },
        },
        {
          metaKey: true,
          key: "i",
          handler: async () => {
            let [sortedBlocks] = await getSortedSelectionBound();
            toggleMarkInBlocks(
              sortedBlocks.filter((b) => b.type === "text").map((b) => b.value),
              schema.marks.em,
            );
          },
        },
        {
          metaKey: true,
          key: "b",
          handler: async () => {
            let [sortedBlocks] = await getSortedSelectionBound();
            toggleMarkInBlocks(
              sortedBlocks.filter((b) => b.type === "text").map((b) => b.value),
              schema.marks.strong,
            );
          },
        },
        {
          metaAndCtrl: true,
          key: "h",
          handler: async () => {
            let [sortedBlocks] = await getSortedSelectionBound();
            toggleMarkInBlocks(
              sortedBlocks.filter((b) => b.type === "text").map((b) => b.value),
              schema.marks.highlight,
              {
                color: useUIState.getState().lastUsedHighlight,
              },
            );
          },
        },
        {
          metaAndCtrl: true,
          key: "x",
          handler: async () => {
            let [sortedBlocks] = await getSortedSelectionBound();
            toggleMarkInBlocks(
              sortedBlocks.filter((b) => b.type === "text").map((b) => b.value),
              schema.marks.strikethrough,
            );
          },
        },
      ]);
    let removeListener = addShortcut(
      shortcuts.map((shortcut) => ({
        ...shortcut,
        handler: () => undoManager.withUndoGroup(() => shortcut.handler()),
      })),
    );
    let listener = async (e: KeyboardEvent) =>
      undoManager.withUndoGroup(async () => {
        //used here and in cut
        const deleteBlocks = async () => {
          if (!entity_set.permissions.write) return;
          if (moreThanOneSelected) {
            e.preventDefault();
            let [sortedBlocks, siblings] = await getSortedSelectionBound();
            let selectedBlocks = useUIState.getState().selectedBlocks;
            let firstBlock = sortedBlocks[0];

            await rep?.mutate.removeBlock(
              selectedBlocks.map((block) => ({ blockEntity: block.value })),
            );
            useUIState.getState().closePage(selectedBlocks.map((b) => b.value));

            let nextBlock =
              siblings?.[
                siblings.findIndex((s) => s.value === firstBlock.value) - 1
              ];
            if (nextBlock) {
              useUIState.getState().setSelectedBlock({
                value: nextBlock.value,
                parent: nextBlock.parent,
              });
              let type = await rep?.query((tx) =>
                scanIndex(tx).eav(nextBlock.value, "block/type"),
              );
              if (!type?.[0]) return;
              if (
                type[0]?.data.value === "text" ||
                type[0]?.data.value === "heading"
              )
                focusBlock(
                  {
                    value: nextBlock.value,
                    type: "text",
                    parent: nextBlock.parent,
                  },
                  { type: "end" },
                );
            }
          }
        };
        if (e.key === "Backspace" || e.key === "Delete") {
          deleteBlocks();
        }
        if (e.key === "ArrowUp") {
          let [sortedBlocks, siblings] = await getSortedSelectionBound();
          let focusedBlock = useUIState.getState().focusedEntity;
          if (!e.shiftKey && !e.ctrlKey) {
            if (e.defaultPrevented) return;
            if (sortedBlocks.length === 1) return;
            let firstBlock = sortedBlocks[0];
            if (!firstBlock) return;
            let type = await rep?.query((tx) =>
              scanIndex(tx).eav(firstBlock.value, "block/type"),
            );
            if (!type?.[0]) return;
            useUIState.getState().setSelectedBlock(firstBlock);
            focusBlock(
              { ...firstBlock, type: type[0].data.value },
              { type: "start" },
            );
          } else {
            if (e.defaultPrevented) return;
            if (
              sortedBlocks.length <= 1 ||
              !focusedBlock ||
              focusedBlock.entityType === "page"
            )
              return;
            let b = focusedBlock;
            let focusedBlockIndex = sortedBlocks.findIndex(
              (s) => s.value == b.entityID,
            );
            if (focusedBlockIndex === 0) {
              let index = siblings.findIndex((s) => s.value === b.entityID);
              let nextSelectedBlock = siblings[index - 1];
              if (!nextSelectedBlock) return;

              scrollIntoViewIfNeeded(
                document.getElementById(
                  elementId.block(nextSelectedBlock.value).container,
                ),
                false,
              );
              useUIState.getState().addBlockToSelection({
                ...nextSelectedBlock,
              });
              useUIState.getState().setFocusedBlock({
                entityType: "block",
                parent: nextSelectedBlock.parent,
                entityID: nextSelectedBlock.value,
              });
            } else {
              let nextBlock = sortedBlocks[sortedBlocks.length - 2];
              useUIState.getState().setFocusedBlock({
                entityType: "block",
                parent: b.parent,
                entityID: nextBlock.value,
              });
              scrollIntoViewIfNeeded(
                document.getElementById(
                  elementId.block(nextBlock.value).container,
                ),
                false,
              );
              if (sortedBlocks.length === 2) {
                useEditorStates
                  .getState()
                  .editorStates[nextBlock.value]?.view?.focus();
              }
              useUIState
                .getState()
                .removeBlockFromSelection(sortedBlocks[focusedBlockIndex]);
            }
          }
        }
        if (e.key === "ArrowLeft") {
          let [sortedSelection, siblings] = await getSortedSelectionBound();
          if (sortedSelection.length === 1) return;
          let firstBlock = sortedSelection[0];
          if (!firstBlock) return;
          let type = await rep?.query((tx) =>
            scanIndex(tx).eav(firstBlock.value, "block/type"),
          );
          if (!type?.[0]) return;
          useUIState.getState().setSelectedBlock(firstBlock);
          focusBlock(
            { ...firstBlock, type: type[0].data.value },
            { type: "start" },
          );
        }
        if (e.key === "ArrowRight") {
          let [sortedSelection, siblings] = await getSortedSelectionBound();
          if (sortedSelection.length === 1) return;
          let lastBlock = sortedSelection[sortedSelection.length - 1];
          if (!lastBlock) return;
          let type = await rep?.query((tx) =>
            scanIndex(tx).eav(lastBlock.value, "block/type"),
          );
          if (!type?.[0]) return;
          useUIState.getState().setSelectedBlock(lastBlock);
          focusBlock(
            { ...lastBlock, type: type[0].data.value },
            { type: "end" },
          );
        }
        if (e.key === "Tab") {
          let [sortedSelection, siblings] = await getSortedSelectionBound();
          if (sortedSelection.length <= 1) return;
          e.preventDefault();

          if (e.shiftKey) {
            let { foldedBlocks, toggleFold } = useUIState.getState();
            await multiSelectOutdent(sortedSelection, siblings, rep, { foldedBlocks, toggleFold });
          } else {
            for (let i = 0; i < siblings.length; i++) {
              let block = siblings[i];
              if (!sortedSelection.find((s) => s.value === block.value))
                continue;
              if (
                sortedSelection.find((s) => s.value === block.listData?.parent)
              )
                continue;
              let parentoffset = 1;
              let previousBlock = siblings[i - parentoffset];
              while (
                previousBlock &&
                sortedSelection.find((s) => previousBlock.value === s.value)
              ) {
                parentoffset += 1;
                previousBlock = siblings[i - parentoffset];
              }
              if (!block.listData || !previousBlock.listData) continue;
              let { foldedBlocks, toggleFold } = useUIState.getState();

              await indent(block, previousBlock, rep, { foldedBlocks, toggleFold });
            }
          }
        }
        if (e.key === "ArrowDown") {
          let [sortedSelection, siblings] = await getSortedSelectionBound();
          let focusedBlock = useUIState.getState().focusedEntity;
          if (!e.shiftKey) {
            if (sortedSelection.length === 1) return;
            let lastBlock = sortedSelection[sortedSelection.length - 1];
            if (!lastBlock) return;
            let type = await rep?.query((tx) =>
              scanIndex(tx).eav(lastBlock.value, "block/type"),
            );
            if (!type?.[0]) return;
            useUIState.getState().setSelectedBlock(lastBlock);
            focusBlock(
              { ...lastBlock, type: type[0].data.value },
              { type: "end" },
            );
          }
          if (e.shiftKey) {
            if (e.defaultPrevented) return;
            if (
              sortedSelection.length <= 1 ||
              !focusedBlock ||
              focusedBlock.entityType === "page"
            )
              return;
            let b = focusedBlock;
            let focusedBlockIndex = sortedSelection.findIndex(
              (s) => s.value == b.entityID,
            );
            if (focusedBlockIndex === sortedSelection.length - 1) {
              let index = siblings.findIndex((s) => s.value === b.entityID);
              let nextSelectedBlock = siblings[index + 1];
              if (!nextSelectedBlock) return;
              useUIState.getState().addBlockToSelection({
                ...nextSelectedBlock,
              });

              scrollIntoViewIfNeeded(
                document.getElementById(
                  elementId.block(nextSelectedBlock.value).container,
                ),
                false,
              );
              useUIState.getState().setFocusedBlock({
                entityType: "block",
                parent: nextSelectedBlock.parent,
                entityID: nextSelectedBlock.value,
              });
            } else {
              let nextBlock = sortedSelection[1];
              useUIState
                .getState()
                .removeBlockFromSelection({ value: b.entityID });
              scrollIntoViewIfNeeded(
                document.getElementById(
                  elementId.block(nextBlock.value).container,
                ),
                false,
              );
              useUIState.getState().setFocusedBlock({
                entityType: "block",
                parent: b.parent,
                entityID: nextBlock.value,
              });
              if (sortedSelection.length === 2) {
                useEditorStates
                  .getState()
                  .editorStates[nextBlock.value]?.view?.focus();
              }
            }
          }
        }
        if ((e.key === "c" || e.key === "x") && (e.metaKey || e.ctrlKey)) {
          if (!rep) return;
          if (e.shiftKey || (e.metaKey && e.ctrlKey)) return;
          let [, , selectionWithFoldedChildren] =
            await getSortedSelectionBound();
          if (!selectionWithFoldedChildren) return;
          let el = document.activeElement as HTMLElement;
          if (
            el?.tagName === "LABEL" ||
            el?.tagName === "INPUT" ||
            el?.tagName === "TEXTAREA"
          ) {
            return;
          }

          if (
            el.contentEditable === "true" &&
            selectionWithFoldedChildren.length <= 1
          )
            return;
          e.preventDefault();
          await copySelection(rep, selectionWithFoldedChildren);
          if (e.key === "x") deleteBlocks();
        }
      });
    window.addEventListener("keydown", listener);
    return () => {
      removeListener();
      window.removeEventListener("keydown", listener);
    };
  }, [moreThanOneSelected, rep, entity_set.permissions.write]);

  let [mouseDown, setMouseDown] = useState(false);
  let initialContentEditableParent = useRef<null | Node>(null);
  let savedSelection = useRef<SavedRange[] | null>(undefined);
  useEffect(() => {
    if (isMobile) return;
    if (!entity_set.permissions.write) return;
    let mouseDownListener = (e: MouseEvent) => {
      if ((e.target as Element).getAttribute("data-draggable")) return;
      let contentEditableParent = getContentEditableParent(e.target as Node);
      if (contentEditableParent) {
        setMouseDown(true);
        let entityID = (contentEditableParent as Element).getAttribute(
          "data-entityid",
        );
        useSelectingMouse.setState({ start: entityID });
      }
      initialContentEditableParent.current = contentEditableParent;
    };
    let mouseUpListener = (e: MouseEvent) => {
      savedSelection.current = null;
      if (
        initialContentEditableParent.current &&
        !(e.target as Element).getAttribute("data-draggable") &&
        getContentEditableParent(e.target as Node) !==
          initialContentEditableParent.current
      ) {
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
        }, 5);
      }
      initialContentEditableParent.current = null;
      useSelectingMouse.setState({ start: null });
      setMouseDown(false);
    };
    window.addEventListener("mousedown", mouseDownListener);
    window.addEventListener("mouseup", mouseUpListener);
    return () => {
      window.removeEventListener("mousedown", mouseDownListener);
      window.removeEventListener("mouseup", mouseUpListener);
    };
  }, [entity_set.permissions.write, isMobile]);
  useEffect(() => {
    if (!mouseDown) return;
    if (isMobile) return;
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
        window.getSelection()?.removeAllRanges();
      }
    };
    window.addEventListener("mousemove", mouseMoveListener);
    return () => {
      window.removeEventListener("mousemove", mouseMoveListener);
    };
  }, [mouseDown, isMobile]);
  return null;
}

type SavedRange = {
  startContainer: Node;
  startOffset: number;
  endContainer: Node;
  endOffset: number;
  direction: "forward" | "backward";
};
function saveSelection() {
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

function restoreSelection(savedRanges: SavedRange[]) {
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
    if (
      (element as HTMLElement).contentEditable === "true" ||
      (element as HTMLElement).getAttribute("data-editable-block")
    ) {
      return element;
    }
    element = element.parentNode;
  }
  return null;
}

function toggleMarkInBlocks(blocks: string[], mark: MarkType, attrs?: any) {
  let everyBlockHasMark = blocks.reduce((acc, block) => {
    let editor = useEditorStates.getState().editorStates[block];
    if (!editor) return acc;
    let { view } = editor;
    let from = 0;
    let to = view.state.doc.content.size;
    let hasMarkInRange = view.state.doc.rangeHasMark(from, to, mark);
    return acc && hasMarkInRange;
  }, true);
  for (let block of blocks) {
    let editor = useEditorStates.getState().editorStates[block];
    if (!editor) return;
    let { view } = editor;
    let tr = view.state.tr;

    let from = 0;
    let to = view.state.doc.content.size;

    tr.setMeta("bulkOp", true);
    if (everyBlockHasMark) {
      tr.removeMark(from, to, mark);
    } else {
      tr.addMark(from, to, mark.create(attrs));
    }

    view.dispatch(tr);
  }
}
