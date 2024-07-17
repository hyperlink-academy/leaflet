import { BlockProps, focusBlock } from "components/Blocks";
import { EditorView } from "prosemirror-view";
import { generateKeyBetween } from "fractional-indexing";
import { setBlockType, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { MutableRefObject } from "react";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { elementId } from "src/utils/elementId";
import { schema } from "./schema";
import { useUIState } from "src/useUIState";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { focusCard } from "components/Cards";
import { v7 } from "uuid";
import { scanIndex } from "src/replicache/utils";

export const TextBlockKeymap = (
  propsRef: MutableRefObject<BlockProps & { entity_set: { set: string } }>,
  repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
) =>
  keymap({
    "Meta-b": toggleMark(schema.marks.strong),
    "Meta-u": toggleMark(schema.marks.underline),
    "Meta-i": toggleMark(schema.marks.em),
    "Ctrl-Meta-x": toggleMark(schema.marks.strikethrough),
    "Ctrl-Meta-h": toggleMark(schema.marks.highlight),
    "-": () => {
      if (propsRef.current.listData) return false;
      repRef.current?.mutate.assertFact({
        entity: propsRef.current.entityID,
        attribute: "block/is-list",
        data: { type: "boolean", value: true },
      });
      return true;
    },
    Tab: () => {
      if (!propsRef.current.listData) return false;
      if (!propsRef.current.previousBlock?.listData) return false;
      let depth = propsRef.current.listData.depth;
      let newParent = propsRef.current.previousBlock.listData.path.find(
        (f) => f.depth === depth,
      );
      console.log(newParent?.entity.slice(-4));
      if (!newParent) return false;
      repRef.current?.mutate.retractFact({ factID: propsRef.current.factID });
      repRef.current?.mutate.addLastBlock({
        parent: newParent.entity,
        factID: v7(),
        entity: propsRef.current.entityID,
      });
      return true;
    },
    "Shift-Tab": () => {
      if (!propsRef.current.listData) return false;
      let listData = propsRef.current.listData;
      let previousBlock = propsRef.current.previousBlock;
      if (listData.depth === 1)
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/is-list",
          data: { type: "boolean", value: false },
        });
      else {
        if (!previousBlock || !previousBlock.listData) return false;
        let after = previousBlock.listData.path.find(
          (f) => f.depth === listData.depth - 1,
        )?.entity;
        if (!after) return false;
        let parent: string | undefined = undefined;
        if (listData.depth === 2) {
          parent = propsRef.current.parent;
        } else {
          parent = previousBlock.listData.path.find(
            (f) => f.depth === listData.depth - 2,
          )?.entity;
        }
        if (!parent) return false;
        repRef.current?.mutate.outdentBlock({
          block: propsRef.current.entityID,
          newParent: parent,
          oldParent: listData.parent,
          after,
        });
      }
      return true;
    },

    Escape: (_state, _dispatch, view) => {
      view?.dom.blur();
      useUIState.setState(() => ({
        focusedBlock: {
          type: "card",
          entityID: propsRef.current.parent,
        },
        selectedBlock: [],
      }));

      return false;
    },
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
              parent: propsRef.current.parent,
            },
            { type: "start" },
          ),
        10,
      );
      return true;
    },
    "Shift-ArrowDown": (state, _dispatch, view) => {
      if (
        state.doc.content.size - 1 === state.selection.from ||
        state.doc.content.size - 1 === state.selection.to
      ) {
        if (propsRef.current.nextBlock) {
          useUIState
            .getState()
            .setSelectedBlocks([propsRef.current, propsRef.current.nextBlock]);
          useUIState.getState().setFocusedBlock({
            type: "block",
            entityID: propsRef.current.nextBlock.value,
            parent: propsRef.current.parent,
          });

          document.getSelection()?.removeAllRanges();
          view?.dom.blur();
          return true;
        }
      }
      return false;
    },
    "Shift-ArrowUp": (state, _dispatch, view) => {
      if (state.selection.from <= 1 || state.selection.to <= 1) {
        if (propsRef.current.previousBlock) {
          useUIState
            .getState()
            .setSelectedBlocks([
              propsRef.current,
              propsRef.current.previousBlock,
            ]);
          useUIState.getState().setFocusedBlock({
            type: "block",
            entityID: propsRef.current.previousBlock.value,
            parent: propsRef.current.parent,
          });

          document.getSelection()?.removeAllRanges();
          view?.dom.blur();
          return true;
        }
      }
      return false;
    },
    ArrowUp: (state, _tr, view) => {
      if (!view) return false;
      if (useUIState.getState().selectedBlock.length > 1) return true;
      if (view.state.selection.from !== view.state.selection.to) return false;
      const viewClientRect = view.dom.getBoundingClientRect();
      const coords = view.coordsAtPos(view.state.selection.anchor);
      if (coords.top - viewClientRect.top < 12) {
        let block = propsRef.current.previousBlock;
        if (block) {
          view.dom.blur();
          focusBlock(block, { left: coords.left, type: "bottom" });
          return true;
        }
        return false;
      }
      return false;
    },
    ArrowDown: (state, tr, view) => {
      if (!view) return true;
      if (useUIState.getState().selectedBlock.length > 1) return true;
      if (view.state.selection.from !== view.state.selection.to) return false;
      const viewClientRect = view.dom.getBoundingClientRect();
      const coords = view.coordsAtPos(view.state.selection.anchor);
      let isBottom = viewClientRect.bottom - coords.bottom < 12;
      if (isBottom) {
        let block = propsRef.current.nextBlock;
        if (block) {
          view.dom.blur();
          focusBlock(block, { left: coords.left, type: "top" });
          return true;
        }
        return false;
      }
      return false;
    },
    ArrowLeft: (state, tr, view) => {
      if (state.selection.content().size > 0) return false;
      if (state.selection.anchor > 1) return false;
      let block = propsRef.current.previousBlock;
      if (block) {
        view?.dom.blur();
        focusBlock(block, { type: "end" });
      }
      return true;
    },
    ArrowRight: (state, tr, view) => {
      if (state.selection.content().size > 0) return false;
      if (state.doc.content.size - state.selection.anchor > 1) return false;
      let block = propsRef.current.nextBlock;
      if (block) {
        view?.dom.blur();
        focusBlock(block, { type: "start" });
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
    if (useUIState.getState().selectedBlock.length > 1) {
      return false;
    }
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
                parent: propsRef.current.parent,
              },
              { type: "start" },
            ),
          10,
        );
      }
      return false;
    }
    if (propsRef.current.listData && propsRef.current.listData.depth === 1) {
      repRef.current?.mutate.assertFact({
        entity: propsRef.current.entityID,
        attribute: "block/is-list",
        data: { type: "boolean", value: false },
      });
      return true;
    }

    let block =
      useEditorStates.getState().editorStates[
        propsRef.current.previousBlock.value
      ];
    if (block && block.editor.doc.textContent.length === 0) {
      repRef.current?.mutate.removeBlock({
        blockEntity: propsRef.current.previousBlock.value,
      });
      return true;
    }

    if (state.doc.textContent.length === 0) {
      repRef.current?.mutate.removeBlock({
        blockEntity: propsRef.current.entityID,
      });
      if (propsRef.current.previousBlock) {
        focusBlock(propsRef.current.previousBlock, { type: "end" });
      }
      return true;
    }

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
    propsRef: MutableRefObject<BlockProps & { entity_set: { set: string } }>,
    repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => {
    let tr = state.tr;
    let newContent = tr.doc.slice(state.selection.anchor);
    tr.delete(state.selection.anchor, state.doc.content.size);
    view?.dom.blur();
    dispatch?.(tr);

    let newEntityID = v7();
    let position: string;
    let asyncRun = async () => {
      let blockType =
        propsRef.current.type === "heading" && state.selection.anchor <= 2
          ? ("heading" as const)
          : ("text" as const);
      if (propsRef.current.listData) {
        let hasChild =
          propsRef.current.nextBlock?.listData &&
          propsRef.current.nextBlock.listData.depth >
            propsRef.current.listData.depth;
        position = generateKeyBetween(
          hasChild ? null : propsRef.current.position,
          propsRef.current.nextBlock?.position,
        );
        await repRef.current?.mutate.addBlock({
          newEntityID,
          factID: v7(),
          permission_set: propsRef.current.entity_set.set,
          parent: hasChild
            ? propsRef.current.entityID
            : propsRef.current.listData.parent,
          type: blockType,
          position,
        });
        await repRef.current?.mutate.assertFact({
          entity: newEntityID,
          attribute: "block/is-list",
          data: { type: "boolean", value: true },
        });
      }
      if (!propsRef.current.listData) {
        position = generateKeyBetween(
          propsRef.current.position,
          propsRef.current.nextPosition,
        );
        await repRef.current?.mutate.addBlock({
          newEntityID,
          factID: v7(),
          permission_set: propsRef.current.entity_set.set,
          parent: propsRef.current.parent,
          type: blockType,
          position,
        });
      }

      if (blockType === "heading") {
        await repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "text" },
        });
        let [headingLevel] =
          (await repRef.current?.query((tx) =>
            scanIndex(tx).eav(propsRef.current.entityID, "block/heading-level"),
          )) || [];
        await repRef.current?.mutate.assertFact({
          entity: newEntityID,
          attribute: "block/heading-level",
          data: { type: "number", value: headingLevel.data.value || 0 },
        });
      }
    };
    asyncRun();

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
        focusBlock(
          {
            value: newEntityID,
            parent: propsRef.current.parent,
            type: "text",
          },
          { type: "start" },
        );
      }
    }, 10);
    return true;
  };
