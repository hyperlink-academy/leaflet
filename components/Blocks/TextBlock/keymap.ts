import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { EditorView } from "prosemirror-view";
import { generateKeyBetween } from "fractional-indexing";
import { baseKeymap, setBlockType, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import {
  Command,
  EditorState,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { RefObject } from "react";
import { Replicache } from "replicache";
import type { Fact, ReplicacheMutators } from "src/replicache";
import { elementId } from "src/utils/elementId";
import { schema } from "./schema";
import { useUIState } from "src/useUIState";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { focusPage } from "src/utils/focusPage";
import { v7 } from "uuid";
import { scanIndex } from "src/replicache/utils";
import { indent, outdent } from "src/utils/list-operations";
import { getBlocksWithType } from "src/replicache/getBlocks";
import { isTextBlock } from "src/utils/isTextBlock";
import { UndoManager } from "src/undoManager";
type PropsRef = RefObject<
  BlockProps & {
    entity_set: { set: string };
    alignment: Fact<"block/text-alignment">["data"]["value"];
  }
>;
export const TextBlockKeymap = (
  propsRef: PropsRef,
  repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  um: UndoManager,
  openMentionAutocomplete: () => void,
) =>
  ({
    "Meta-b": toggleMark(schema.marks.strong),
    "Ctrl-b": toggleMark(schema.marks.strong),
    "Meta-u": toggleMark(schema.marks.underline),
    "Ctrl-u": toggleMark(schema.marks.underline),
    "Meta-i": toggleMark(schema.marks.em),
    "Ctrl-i": toggleMark(schema.marks.em),
    "Ctrl-Meta-x": toggleMark(schema.marks.strikethrough),
    "Ctrl-Meta-h": (...args) => {
      return toggleMark(schema.marks.highlight, {
        color: useUIState.getState().lastUsedHighlight,
      })(...args);
    },
    "Ctrl-a": metaA(propsRef, repRef),
    "Meta-a": metaA(propsRef, repRef),
    Escape: (_state, _dispatch, view) => {
      view?.dom.blur();
      useUIState.setState(() => ({
        focusedEntity: {
          entityType: "page",
          entityID: propsRef.current.parent,
        },
        selectedBlocks: [],
      }));

      return false;
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
            entityType: "block",
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
            entityType: "block",
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
    "Ctrl-k": moveCursorUp(propsRef, repRef, true),
    ArrowUp: moveCursorUp(propsRef, repRef),
    "Ctrl-j": moveCursorDown(propsRef, repRef, true),
    ArrowDown: moveCursorDown(propsRef, repRef),
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
    Backspace: (state, dispatch, view) =>
      um.withUndoGroup(() =>
        backspace(propsRef, repRef)(state, dispatch, view),
      ),
    "Shift-Backspace": backspace(propsRef, repRef),
    Enter: (state, dispatch, view) => {
      return um.withUndoGroup(() => {
        return enter(propsRef, repRef)(state, dispatch, view);
      });
    },
    "Shift-Enter": (state, dispatch, view) => {
      // Insert a hard break
      let hardBreak = schema.nodes.hard_break.create();
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(hardBreak).scrollIntoView());
      }
      return true;
    },
    "Ctrl-Enter": CtrlEnter(propsRef, repRef),
    "Meta-Enter": CtrlEnter(propsRef, repRef),
  }) as { [key: string]: Command };

const moveCursorDown =
  (
    propsRef: PropsRef,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
    jumpToNextBlock: boolean = false,
  ) =>
  (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => {
    if (!view) return true;
    if (state.doc.textContent.startsWith("/")) return true;
    if (useUIState.getState().selectedBlocks.length > 1) return true;
    if (view.state.selection.from !== view.state.selection.to) return false;
    const viewClientRect = view.dom.getBoundingClientRect();
    const coords = view.coordsAtPos(view.state.selection.anchor);
    let isBottom = viewClientRect.bottom - coords.bottom < 12;
    if (isBottom || jumpToNextBlock) {
      let block = propsRef.current.nextBlock;
      if (block) {
        view.dom.blur();
        focusBlock(block, { left: coords.left, type: "top" });
        return true;
      }
      return false || jumpToNextBlock;
    }
    return false;
  };
const moveCursorUp =
  (
    propsRef: PropsRef,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
    jumpToNextBlock: boolean = false,
  ) =>
  (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => {
    if (!view) return false;
    if (state.doc.textContent.startsWith("/")) return true;
    if (useUIState.getState().selectedBlocks.length > 1) return true;
    if (view.state.selection.from !== view.state.selection.to) return false;
    const viewClientRect = view.dom.getBoundingClientRect();
    const coords = view.coordsAtPos(view.state.selection.anchor);
    if (coords.top - viewClientRect.top < 12 || jumpToNextBlock) {
      let block = propsRef.current.previousBlock;
      if (block) {
        view.dom.blur();
        focusBlock(block, { left: coords.left, type: "bottom" });
        return true;
      }
      return false || jumpToNextBlock;
    }
    return false;
  };

const backspace =
  (
    propsRef: PropsRef,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => {
    // if multiple blocks are selected, don't do anything (handled in SelectionManager)
    if (useUIState.getState().selectedBlocks.length > 1) {
      return false;
    }
    // if you are selecting text within a block, don't do anything (handled by proseMirror)
    if (state.selection.anchor > 1 || state.selection.content().size > 0) {
      return false;
    }
    // if you are in a list...
    if (propsRef.current.listData) {
      // ...and the item is a checklist item, remove the checklist attribute
      if (propsRef.current.listData.checklist) {
        repRef.current?.mutate.retractAttribute({
          entity: propsRef.current.entityID,
          attribute: "block/check-list",
        });
        return true;
      }
      // ...move the child list items to next eligible parent (?)
      let depth = propsRef.current.listData.depth;
      repRef.current?.mutate.moveChildren({
        oldParent: propsRef.current.entityID,
        newParent: propsRef.current.previousBlock?.listData
          ? propsRef.current.previousBlock.value
          : propsRef.current.listData.parent || propsRef.current.parent,
        after:
          propsRef.current.previousBlock?.listData?.path.find(
            (f) => f.depth === depth,
          )?.entity ||
          propsRef.current.previousBlock?.value ||
          null,
      });
    }
    // if this is the first block and is it a list, remove list attribute
    if (!propsRef.current.previousBlock) {
      if (propsRef.current.listData) {
        repRef.current?.mutate.retractAttribute({
          entity: propsRef.current.entityID,
          attribute: "block/is-list",
        });
        return true;
      }

      // If the block is a heading, convert it to a text block
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
                type: "text",
                parent: propsRef.current.parent,
              },
              { type: "start" },
            ),
          10,
        );

        return false;
      }

      if (propsRef.current.pageType === "canvas") {
        repRef.current?.mutate.removeBlock({
          blockEntity: propsRef.current.entityID,
        });
      }
      return true;
    }

    let block = !!propsRef.current.previousBlock
      ? useEditorStates.getState().editorStates[
          propsRef.current.previousBlock.value
        ]
      : null;
    if (
      block &&
      propsRef.current.previousBlock &&
      block.editor.doc.textContent.length === 0 &&
      !propsRef.current.previousBlock?.listData
    ) {
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
      } else {
        useUIState.getState().setFocusedBlock({
          entityType: "page",
          entityID: propsRef.current.parent,
        });
      }
      return true;
    }

    if (
      propsRef.current.previousBlock &&
      !isTextBlock[propsRef.current.previousBlock?.type]
    ) {
      focusBlock(propsRef.current.previousBlock, { type: "end" });
      view?.dom.blur();
      return true;
    }

    if (!block || !propsRef.current.previousBlock) return false;

    repRef.current?.mutate.removeBlock({
      blockEntity: propsRef.current.entityID,
    });

    let tr = block.editor.tr;

    block.view?.focus();
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

const shifttab =
  (
    propsRef: RefObject<BlockProps & { entity_set: { set: string } }>,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  async () => {
    if (useUIState.getState().selectedBlocks.length > 1) return false;
    if (!repRef.current) return false;
    if (!repRef.current) return false;
    let { foldedBlocks, toggleFold } = useUIState.getState();
    await outdent(propsRef.current, propsRef.current.previousBlock, repRef.current, {
      foldedBlocks,
      toggleFold,
    });
    return true;
  };

const enter =
  (
    propsRef: PropsRef,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => {
    if (state.doc.textContent.startsWith("/")) return true;
    let tr = state.tr;
    let newContent = tr.doc.slice(state.selection.anchor);
    tr.delete(state.selection.anchor, state.doc.content.size);
    dispatch?.(tr);

    let newEntityID = v7();
    let position: string;
    let asyncRun = async () => {
      let blockType =
        propsRef.current.type === "heading" && state.selection.anchor <= 2
          ? ("heading" as const)
          : ("text" as const);
      if (propsRef.current.pageType === "canvas") {
        let el = document.getElementById(
          elementId.block(propsRef.current.entityID).container,
        );
        let [position] =
          (await repRef.current?.query((tx) =>
            scanIndex(tx).vae(propsRef.current.entityID, "canvas/block"),
          )) || [];
        if (!position || !el) return;

        let box = el.getBoundingClientRect();

        await repRef.current?.mutate.addCanvasBlock({
          newEntityID,
          factID: v7(),
          permission_set: propsRef.current.entity_set.set,
          parent: propsRef.current.parent,
          type: blockType,
          position: {
            x: position.data.position.x,
            y: position.data.position.y + box.height,
          },
        });
        if (propsRef.current.listData) {
          await repRef.current?.mutate.assertFact({
            entity: newEntityID,
            attribute: "block/is-list",
            data: { type: "boolean", value: true },
          });
          // Copy list style for canvas blocks
          let listStyle = await repRef.current?.query((tx) =>
            scanIndex(tx).eav(propsRef.current.entityID, "block/list-style"),
          );
          if (listStyle?.[0]) {
            await repRef.current?.mutate.assertFact({
              entity: newEntityID,
              attribute: "block/list-style",
              data: {
                type: "list-style-union",
                value: listStyle[0].data.value,
              },
            });
          }
        }
        return;
      }
      if (propsRef.current.listData) {
        if (state.doc.content.size <= 2) {
          return shifttab(propsRef, repRef)();
        }
        let createChild =
          propsRef.current.nextBlock?.listData &&
          propsRef.current.nextBlock.listData.depth >
            propsRef.current.listData.depth &&
          state.selection.anchor === state.doc.content.size - 1 &&
          !useUIState
            .getState()
            .foldedBlocks.includes(propsRef.current.entityID);

        if (!createChild) {
          //get this items next sibling
          let parent = propsRef.current.listData.parent;
          let siblings = (
            (await repRef.current?.query((tx) =>
              scanIndex(tx).eav(parent, "card/block"),
            )) || []
          ).sort((a, b) => (a.data.position > b.data.position ? 1 : -1));
          let index = siblings.findIndex(
            (sib) => sib.data.value === propsRef.current.entityID,
          );
          position = generateKeyBetween(
            propsRef.current.position,
            siblings[index + 1]?.data.position || null,
          );
        } else {
          //Get this blocks children and get the first one
          let children = (
            (await repRef.current?.query((tx) =>
              scanIndex(tx).eav(propsRef.current.entityID, "card/block"),
            )) || []
          ).sort((a, b) => (a.data.position > b.data.position ? 1 : -1));
          position = generateKeyBetween(
            createChild ? null : propsRef.current.position,
            children[0]?.data.position || null,
          );
        }
        await repRef.current?.mutate.addBlock({
          newEntityID,
          factID: v7(),
          permission_set: propsRef.current.entity_set.set,
          parent: createChild
            ? propsRef.current.entityID
            : propsRef.current.listData.parent,
          type: blockType,
          position,
        });
        if (
          !createChild &&
          (!useUIState
            .getState()
            .foldedBlocks.includes(propsRef.current.entityID) ||
            state.selection.anchor === 1)
        ) {
          await repRef.current?.mutate.moveChildren({
            oldParent: propsRef.current.entityID,
            newParent: newEntityID,
            after: null,
          });
        }
        await repRef.current?.mutate.assertFact({
          entity: newEntityID,
          attribute: "block/is-list",
          data: { type: "boolean", value: true },
        });
        // Copy list style (ordered/unordered) to new list item
        let listStyle = await repRef.current?.query((tx) =>
          scanIndex(tx).eav(propsRef.current.entityID, "block/list-style"),
        );
        if (listStyle?.[0]) {
          await repRef.current?.mutate.assertFact({
            entity: newEntityID,
            attribute: "block/list-style",
            data: {
              type: "list-style-union",
              value: listStyle[0].data.value,
            },
          });
        }
        let checked = await repRef.current?.query((tx) =>
          scanIndex(tx).eav(propsRef.current.entityID, "block/check-list"),
        );
        if (checked?.[0])
          await repRef.current?.mutate.assertFact({
            entity: newEntityID,
            attribute: "block/check-list",
            data: {
              type: "boolean",
              value:
                state.selection.anchor === 1 ? checked?.[0].data.value : false,
            },
          });
      }
      // if the block is not a list, add a new text block after it
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
      // if you are are the beginning of a heading, move the heading level to the new block
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
      if (propsRef.current.alignment !== "left") {
        await repRef.current?.mutate.assertFact({
          entity: newEntityID,
          attribute: "block/text-alignment",
          data: {
            type: "text-alignment-type-union",
            value: propsRef.current.alignment,
          },
        });
      }
      let [textSize] =
        (await repRef.current?.query((tx) =>
          scanIndex(tx).eav(propsRef.current.entityID, "block/text-size"),
        )) || [];
      if (textSize) {
        await repRef.current?.mutate.assertFact({
          entity: newEntityID,
          attribute: "block/text-size",
          data: {
            type: "text-size-union",
            value: textSize.data.value,
          },
        });
      }
    };
    asyncRun().then(() => {
      useUIState.getState().setSelectedBlock({
        value: newEntityID,
        parent: propsRef.current.parent,
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
    });

    // if you are in the middle of a text block, split the block
    return true;
  };

const CtrlEnter =
  (
    propsRef: RefObject<BlockProps & { entity_set: { set: string } }>,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => {
    repRef.current?.mutate.toggleTodoState({
      entityID: propsRef.current.entityID,
    });
    return true;
  };

const metaA =
  (
    propsRef: RefObject<BlockProps & { entity_set: { set: string } }>,
    repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  ) =>
  (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined,
    view: EditorView | undefined,
  ) => {
    const { from, to } = state.selection;
    // Check if the entire content of the blockk is selected
    const isFullySelected = from === 0 && to === state.doc.content.size;

    if (!isFullySelected) {
      // If the entire block is selected, we don't need to do anything
      return false;
    } else {
      // Remove the selection
      view?.dispatch(
        state.tr.setSelection(TextSelection.create(state.doc, from)),
      );
      view?.dom.blur();
      repRef.current?.query(async (tx) => {
        let allBlocks =
          (await getBlocksWithType(tx, propsRef.current.parent)) || [];
        useUIState.setState({
          selectedBlocks: allBlocks.map((b) => ({
            value: b.value,
            parent: propsRef.current.parent,
          })),
        });
      });
      return true;
    }
  };
