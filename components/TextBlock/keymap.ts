import { BlockProps, focusBlock } from "components/Blocks";
import { generateKeyBetween } from "fractional-indexing";
import { setBlockType, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { MutableRefObject } from "react";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { elementId } from "src/utils/elementId";
import { setEditorState, useEditorStates } from ".";
import { schema } from "./schema";

export const TextBlockKeymap = (
  propsRef: MutableRefObject<BlockProps>,
  repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
) =>
  keymap({
    "Meta-b": toggleMark(schema.marks.strong),
    "Meta-u": toggleMark(schema.marks.underline),
    "Meta-i": toggleMark(schema.marks.em),
    "#": (state, dispatch, view) => {
      if (state.selection.content().size > 0) return false;
      if (state.selection.anchor > 1) return false;
      repRef.current?.mutate.increaseHeadingLevel({
        entityID: propsRef.current.entityID,
      });
      setTimeout(
        () =>
          focusBlock(
            {
              value: propsRef.current.entityID,
              type: "heading",
              position: propsRef.current.position,
            },
            "start",
            "bottom",
          ),
        10,
      );
      return true;
    },
    ArrowUp: (_state, _tr, view) => {
      if (!view) return false;
      const viewClientRect = view.dom.getBoundingClientRect();
      const coords = view.coordsAtPos(view.state.selection.anchor);
      if (coords.top - viewClientRect.top < 5) {
        let block = propsRef.current.previousBlock;
        if (block) {
          view.dom.blur();
          focusBlock(block, coords.left, "bottom");
        }
        return true;
      }
      return false;
    },
    ArrowDown: (state, tr, view) => {
      if (!view) return true;
      const viewClientRect = view.dom.getBoundingClientRect();
      const coords = view.coordsAtPos(view.state.selection.anchor);
      let isBottom = viewClientRect.bottom - coords.bottom < 12;
      if (isBottom) {
        let block = propsRef.current.nextBlock;
        if (block) {
          view.dom.blur();
          focusBlock(block, coords.left, "top");
        }
        return true;
      }
      return false;
    },
    ArrowLeft: (state, tr, view) => {
      if (state.selection.content().size > 0) return false;
      if (state.selection.anchor > 1) return false;
      let block = propsRef.current.previousBlock;
      if (block) {
        view?.dom.blur();
        focusBlock(block, "end", "top");
      }
      return true;
    },
    ArrowRight: (state, tr, view) => {
      if (state.selection.content().size > 0) return false;
      if (state.doc.content.size - state.selection.anchor > 1) return false;
      let block = propsRef.current.nextBlock;
      if (block) {
        view?.dom.blur();
        focusBlock(block, "start", "top");
      }
      return true;
    },
    Backspace: backspace(propsRef, repRef),
    "Shift-Backspace": backspace(propsRef, repRef),
    Enter: enter(propsRef, repRef),
    "Shift-Enter": enter(propsRef, repRef),
  });

const backspace =
  (
    propsRef: MutableRefObject<BlockProps>,
    repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (state: EditorState) => {
    if (state.selection.anchor > 1 || state.selection.content().size > 0) {
      return false;
    }
    if (!propsRef.current.previousBlock) {
      if (propsRef.current.type === "heading") {
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "text" },
        });
        setTimeout(
          () =>
            focusBlock(
              {
                value: propsRef.current.entityID,
                type: "heading",
                position: propsRef.current.position,
              },
              "start",
              "bottom",
            ),
          10,
        );
      }
      return false;
    }

    if (state.doc.textContent.length === 0) {
      repRef.current?.mutate.removeBlock({
        blockEntity: propsRef.current.entityID,
      });
      if (propsRef.current.previousBlock) {
        focusBlock(propsRef.current.previousBlock, "end", "bottom");
      }
      return true;
    }

    let block =
      useEditorStates.getState().editorStates[
        propsRef.current.previousBlock.value
      ];
    if (!block) return false;

    repRef.current?.mutate.removeBlock({
      blockEntity: propsRef.current.entityID,
    });

    let tr = block.editor.tr;

    block.view?.dom.focus();
    let firstChild = state.doc.content.firstChild?.content;
    if (firstChild) {
      tr.insert(tr.doc.content.size - 1, firstChild);
      tr.setSelection(
        TextSelection.create(
          tr.doc,
          tr.doc.content.size - firstChild?.size - 1,
        ),
      );
    }

    let newState = block.editor.apply(tr);
    setEditorState(propsRef.current.previousBlock.value, {
      editor: newState,
    });

    return true;
  };

const enter =
  (
    propsRef: MutableRefObject<BlockProps>,
    repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    let tr = state.tr;
    let newContent = tr.doc.slice(state.selection.anchor);
    tr.delete(state.selection.anchor, state.doc.content.size);
    dispatch?.(tr);
    let newEntityID = crypto.randomUUID();
    repRef.current?.mutate.addBlock({
      newEntityID,
      parent: propsRef.current.parent,
      type: "text",
      position: generateKeyBetween(
        propsRef.current.position,
        propsRef.current.nextPosition,
      ),
    });
    setTimeout(() => {
      let block = useEditorStates.getState().editorStates[newEntityID];
      if (block) {
        let tr = block.editor.tr;
        if (newContent.content.size > 2) {
          tr.replaceWith(0, tr.doc.content.size, newContent.content);
          tr.setSelection(TextSelection.create(tr.doc, 0));
          let newState = block.editor.apply(tr);
          setEditorState(newEntityID, {
            editor: newState,
          });
        }
      }
      document.getElementById(elementId.block(newEntityID).text)?.focus();
    }, 10);
    return true;
  };
