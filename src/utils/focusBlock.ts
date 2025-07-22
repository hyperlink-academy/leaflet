import { TextSelection } from "prosemirror-state";
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
    //Change the constants here based on padding!
    if (position.type === "top") {
      let top =
        document
          .getElementById(elementId.block(block.value).container)
          ?.getBoundingClientRect().top || 0;
      let pos = getPosAtCoordinates(
        position.left + 2,
        top + (block.type === "code" ? 48 : 32),
      );

      if (pos.offset) {
        let el = pos.textNode as HTMLTextAreaElement;
        el.focus();
        el?.setSelectionRange(pos.offset, pos.offset);
      }
    }
    if (position.type === "bottom") {
      let bottom =
        document
          .getElementById(elementId.block(block.value).container)
          ?.getBoundingClientRect().bottom || 0;

      let pos = getPosAtCoordinates(position.left + 2, bottom - 32);
      if (pos.offset) {
        let el = pos.textNode as HTMLTextAreaElement;
        el?.setSelectionRange?.(pos.offset, pos.offset);
      }
    }
  }

  // if its not a text block, that's all we need to do
  if (block.type !== "text" && block.type !== "heading") {
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

  nextBlock.view.dispatch(
    tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 1)),
  );
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
