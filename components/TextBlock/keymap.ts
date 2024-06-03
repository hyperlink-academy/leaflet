import { BlockProps, focusBlock } from "app/[doc_id]/Blocks";
import { generateKeyBetween } from "fractional-indexing";
import { toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Selection, TextSelection } from "prosemirror-state";
import { MutableRefObject } from "react";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { elementId } from "src/utils/elementId";
import { schema, setEditorState, useEditorStates } from ".";

export const TextBlockKeymap = (
  propsRef: MutableRefObject<BlockProps>,
  repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
) =>
  keymap({
    "Meta-b": toggleMark(schema.marks.strong),
    "Meta-i": toggleMark(schema.marks.em),
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
      let isBottom = viewClientRect.bottom - coords.bottom < 5;
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
    Backspace: (state) => {
      if (!propsRef.current.previousBlock) return false;
      if (!state.selection.eq(Selection.atStart(state.doc))) return false;

      if (state.doc.textContent.length === 0) {
        repRef.current?.mutate.removeBlock({
          blockEntity: propsRef.current.entityID,
        });
        if (propsRef.current.previousBlock) {
          focusBlock(propsRef.current.previousBlock, "end", "bottom");
        }
        return false;
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

      return false;
    },
    "Shift-Enter": () => {
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
        document.getElementById(elementId.block(newEntityID).text)?.focus();
      }, 10);
      return true;
    },
  });
