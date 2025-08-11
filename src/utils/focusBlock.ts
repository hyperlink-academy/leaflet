import { NodeSelection, TextSelection } from "prosemirror-state";
import { useUIState } from "src/useUIState";
import { Block } from "components/Blocks/Block";
import { elementId } from "src/utils/elementId";

import { useEditorStates } from "src/state/useEditorState";
import { scrollIntoViewIfNeeded } from "./scrollIntoViewIfNeeded";
import { getPosAtCoordinates } from "./getCoordinatesInTextarea";
import { flushSync } from "react-dom";

export function focusBlock(
  block: Pick<Block, "type" | "value" | "parent">,
  position: Position,
) {
  // focus the block
  flushSync(() => {
    useUIState.getState().setSelectedBlock(block);
    useUIState.getState().setFocusedBlock({
      entityType: "block",
      entityID: block.value,
      parent: block.parent,
    });
  });
  scrollIntoViewIfNeeded(
    document.getElementById(elementId.block(block.value).container),
    false,
  );
  if (block.type === "math" || block.type === "code") {
    let el = document.getElementById(
      elementId.block(block.value).input,
    ) as HTMLTextAreaElement;
    let pos;
    if (position.type === "start") {
      pos = { offset: 0 };
    }

    if (position.type === "end") {
      pos = { offset: el.textContent?.length || 0 };
    }
    if (position.type === "top" || position.type === "bottom") {
      let inputRect = el?.getBoundingClientRect();
      let left = Math.max(position.left, inputRect?.left || 0);
      let top =
        position.type === "top"
          ? (inputRect?.top || 0) + 10
          : (inputRect?.bottom || 0) - 10;
      pos = getPosAtCoordinates(left, top);
    }

    if (pos?.offset !== undefined) {
      el?.focus();
      requestAnimationFrame(() => {
        el?.setSelectionRange(pos.offset, pos.offset);
      });
    }
  }

  // if its not a text block, that's all we need to do
  if (
    block.type !== "text" &&
    block.type !== "heading" &&
    block.type !== "blockquote"
  ) {
    return true;
  }
  // if its a text block, and not an empty block that is last on the page,
  // focus the editor using the mouse position if needed
  let nextBlockID = block.value;
  let nextBlock = useEditorStates.getState().editorStates[nextBlockID];
  if (!nextBlock || !nextBlock.view) return;
  let nextBlockViewClientRect = nextBlock.view.dom.getBoundingClientRect();
  let tr = nextBlock.editor.tr;
  let pos: { pos: number } | null = null;
  switch (position.type) {
    case "end": {
      pos = { pos: tr.doc.content.size - 1 };
      break;
    }
    case "start": {
      pos = { pos: 1 };
      break;
    }
    case "top": {
      console.log(position.left);
      pos = nextBlock.view.posAtCoords({
        top: nextBlockViewClientRect.top + 12,
        left: position.left,
      });
      console.log(pos);
      break;
    }
    case "bottom": {
      pos = nextBlock.view.posAtCoords({
        top: nextBlockViewClientRect.bottom - 12,
        left: position.left,
      });
      break;
    }
    case "coord": {
      pos = nextBlock.view.posAtCoords({
        top: position.top,
        left: position.left,
      });
      break;
    }
  }

  if (block.type === "blockquote") {
    let sel = NodeSelection.create(tr.doc, 0);
    nextBlock.view.dispatch(tr.setSelection(sel));
  } else {
    nextBlock.view.dispatch(
      tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 1)),
    );
  }
  nextBlock.view.focus();
}

type Position =
  | {
      type: "start";
    }
  | { type: "end" }
  | {
      type: "coord";
      top: number;
      left: number;
    }
  | {
      type: "top";
      left: number;
    }
  | {
      type: "bottom";
      left: number;
    };
