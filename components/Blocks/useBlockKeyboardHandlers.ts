import { useEffect } from "react";
import { useUIState } from "src/useUIState";
import { useEditorStates } from "src/state/useEditorState";

import { isTextBlock } from "src/utils/isTextBlock";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { indent, outdent } from "src/utils/list-operations";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import { BlockProps } from "./Block";
import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { Replicache } from "replicache";
import { deleteBlock } from "src/utils/deleteBlock";
import { entities } from "drizzle/schema";
import { scanIndex } from "src/replicache/utils";

export function useBlockKeyboardHandlers(
  props: BlockProps,
  areYouSure: boolean,
  setAreYouSure: (value: boolean) => void,
) {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();

  let isSelected = useUIState((s) => {
    let selectedBlocks = s.selectedBlocks;
    return !!s.selectedBlocks.find((b) => b.value === props.entityID);
  });

  useEffect(() => {
    if (!isSelected || !rep) return;
    let listener = async (e: KeyboardEvent) => {
      // keymapping for textBlocks is handled in TextBlock/keymap
      if (e.defaultPrevented) return;
      //if no permissions, do nothing
      if (!entity_set.permissions.write) return;
      let command = {
        Tab,
        ArrowUp,
        ArrowDown,
        Backspace,
        Enter,
        Escape,
        j,
        k,
      }[e.key];

      let el = e.target as HTMLElement;
      if (
        (el.tagName === "LABEL" ||
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.contentEditable === "true") &&
        !isTextBlock[props.type]
      ) {
        if ((el as HTMLInputElement).value !== "" || e.key === "Tab") return;
      }
      if (!AllowedIfTextBlock.includes(e.key) && isTextBlock[props.type])
        return;

      undoManager.startGroup();
      await command?.({
        e,
        props,
        rep,
        entity_set,
        areYouSure,
        setAreYouSure,
      });
      setTimeout(() => undoManager.endGroup(), 100);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [entity_set, isSelected, props, rep, areYouSure, setAreYouSure]);
}

type Args = {
  e: KeyboardEvent;
  props: BlockProps;
  rep: Replicache<ReplicacheMutators>;
  entity_set: { set: string };
  areYouSure: boolean;
  setAreYouSure: (value: boolean) => void;
};

const AllowedIfTextBlock = ["Tab"];

async function Tab({ e, props, rep }: Args) {
  // if tab or shift tab, indent or outdent
  if (useUIState.getState().selectedBlocks.length > 1) return false;
  let { foldedBlocks, toggleFold } = useUIState.getState();
  if (e.shiftKey) {
    e.preventDefault();
    await outdent(props, props.previousBlock, rep, { foldedBlocks, toggleFold });
  } else {
    e.preventDefault();
    if (props.previousBlock) {
      await indent(props, props.previousBlock, rep, { foldedBlocks, toggleFold });
    }
  }
}

function j(args: Args) {
  if (args.e.ctrlKey || args.e.metaKey) ArrowDown(args);
}
function ArrowDown({ e, props }: Args) {
  e.preventDefault();
  let nextBlock = props.nextBlock;
  if (nextBlock && useUIState.getState().selectedBlocks.length <= 1)
    focusBlock(nextBlock, {
      type: "top",
      left: useEditorStates.getState().lastXPosition,
    });
  if (!nextBlock) return;
}

function k(args: Args) {
  if (args.e.ctrlKey || args.e.metaKey) ArrowUp(args);
}
function ArrowUp({ e, props }: Args) {
  e.preventDefault();
  let prevBlock = props.previousBlock;
  if (prevBlock && useUIState.getState().selectedBlocks.length <= 1) {
    focusBlock(prevBlock, {
      type: "bottom",
      left: useEditorStates.getState().lastXPosition,
    });
  }
  if (!prevBlock) return;
}

let debounced: null | number = null;
async function Backspace({ e, props, rep, areYouSure, setAreYouSure }: Args) {
  // if this is a textBlock, let the textBlock/keymap handle the backspace
  // if its an input, label, or teatarea with content, do nothing (do the broswer default instead)
  let el = e.target as HTMLElement;
  if (
    el.tagName === "LABEL" ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.contentEditable === "true"
  ) {
    if ((el as HTMLInputElement).value !== "") return;
  }

  // if the block is a card, mailbox, rsvp, or poll...
  if (
    props.type === "card" ||
    props.type === "mailbox" ||
    props.type === "rsvp" ||
    props.type === "poll"
  ) {
    // ...and areYouSure state is false, set it to true
    if (!areYouSure) {
      setAreYouSure(true);
      debounced = window.setTimeout(() => {
        debounced = null;
      }, 300);
      return;
    }
    // ... and areYouSure state is true,
    // and the user is not in an input or textarea, remove it
    // if there is a page to close, close it
    if (areYouSure) {
      e.preventDefault();
      if (debounced) {
        window.clearTimeout(debounced);
        debounced = window.setTimeout(() => {
          debounced = null;
        }, 300);
        return;
      }
      return deleteBlock([props.entityID].flat(), rep);
    }
  }

  e.preventDefault();
  await rep.mutate.removeBlock({ blockEntity: props.entityID });
  useUIState.getState().closePage(props.entityID);
  let prevBlock = props.previousBlock;
  if (prevBlock) focusBlock(prevBlock, { type: "end" });
}

async function Enter({ e, props, rep, entity_set }: Args) {
  let newEntityID = v7();
  let position;
  let el = e.target as HTMLElement;
  if (
    el.tagName === "LABEL" ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.contentEditable === "true"
  )
    return;

  if (e.ctrlKey || e.metaKey) {
    if (props.listData) {
      rep?.mutate.toggleTodoState({
        entityID: props.entityID,
      });
    }
    return;
  }
  if (props.pageType === "canvas") {
    let el = document.getElementById(elementId.block(props.entityID).container);
    let [position] =
      (await rep?.query((tx) =>
        scanIndex(tx).vae(props.entityID, "canvas/block"),
      )) || [];
    if (!position || !el) return;

    let box = el.getBoundingClientRect();

    await rep.mutate.addCanvasBlock({
      newEntityID,
      factID: v7(),
      permission_set: entity_set.set,
      parent: props.parent,
      type: "text",
      position: {
        x: position.data.position.x,
        y: position.data.position.y + box.height + 12,
      },
    });
    focusBlock(
      { type: "text", value: newEntityID, parent: props.parent },
      { type: "start" },
    );
    return;
  }

  // if it's a list, create a new list item at the same depth
  if (props.listData) {
    let hasChild =
      props.nextBlock?.listData &&
      props.nextBlock.listData.depth > props.listData.depth;
    position = generateKeyBetween(
      hasChild ? null : props.position,
      props.nextPosition,
    );
    await rep?.mutate.addBlock({
      newEntityID,
      factID: v7(),
      permission_set: entity_set.set,
      parent: hasChild ? props.entityID : props.listData.parent,
      type: "text",
      position,
    });
    await rep?.mutate.assertFact({
      entity: newEntityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: true },
    });
  }

  // if it's not a list, create a new block between current and next block
  if (!props.listData) {
    position = generateKeyBetween(props.position, props.nextPosition);
    await rep?.mutate.addBlock({
      newEntityID,
      factID: v7(),
      permission_set: entity_set.set,
      parent: props.parent,
      type: "text",
      position,
    });
  }
  setTimeout(() => {
    document.getElementById(elementId.block(newEntityID).text)?.focus();
  }, 10);
}

function Escape({ e, props, areYouSure, setAreYouSure }: Args) {
  e.preventDefault();
  if (areYouSure) {
    setAreYouSure(false);
    focusBlock(
      { type: "card", value: props.entityID, parent: props.parent },
      { type: "start" },
    );
  }

  useUIState.setState({ selectedBlocks: [] });
  useUIState.setState({
    focusedEntity: { entityType: "page", entityID: props.parent },
  });
}
