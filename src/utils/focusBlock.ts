import { TextSelection } from "prosemirror-state";
import { useUIState } from "src/useUIState";
import { Block } from "components/Blocks/Block";

import { setEditorState, useEditorStates } from "src/state/useEditorState";

export function focusBlock(
  block: Pick<Block, "type" | "value" | "parent">,
  position: Position,
) {
  useUIState.getState().setSelectedBlock(block);
  useUIState.getState().setFocusedBlock({
    entityType: "block",
    entityID: block.value,
    parent: block.parent,
  });
  if (block.type !== "text" && block.type !== "heading") {
    return true;
  }
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
      pos = nextBlock.view.posAtCoords({
        top: nextBlockViewClientRect.top + 12,
        left: position.left,
      });
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
