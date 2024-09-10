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
import { deleteBlock } from "./DeleteBlock";
import { entities } from "drizzle/schema";
import { scanIndex } from "src/replicache/utils";

export function useBlockKeyboardHandlers(
  props: BlockProps,
  areYouSure: boolean,
  setAreYouSure: (value: boolean) => void,
) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();

  let selectedBlocks = useUIState((s) => s.selectedBlocks);
  let actuallySelected = useUIState(
    (s) => !!s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let hasSelectionUI =
    (!isTextBlock[props.type] || selectedBlocks.length > 1) && actuallySelected;

  useEffect(() => {
    if (!hasSelectionUI || !rep) return;
    let listener = async (e: KeyboardEvent) => {
      // keymapping for textBlocks is handled in TextBlock/keymap
      if (e.defaultPrevented) return;
      //if no permissions, do nothing
      if (!entity_set.permissions.write) return;
      let command = { Tab, ArrowUp, ArrowDown, Backspace, Enter, Escape }[
        e.key
      ];
      command?.({ e, props, rep, entity_set, areYouSure, setAreYouSure });
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [entity_set, hasSelectionUI, props, rep, areYouSure, setAreYouSure]);
}

type Args = {
  e: KeyboardEvent;
  props: BlockProps;
  rep: Replicache<ReplicacheMutators>;
  entity_set: { set: string };
  areYouSure: boolean;
  setAreYouSure: (value: boolean) => void;
};

function Tab({ e, props, rep }: Args) {
  // if tab or shift tab & not a textBlock, indent or outdent
  if (isTextBlock[props.type]) return;
  if (e.shiftKey) {
    e.preventDefault();
    outdent(props, props.previousBlock, rep);
  } else {
    e.preventDefault();
    if (props.previousBlock) indent(props, props.previousBlock, rep);
  }
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

async function Backspace({ e, props, rep, areYouSure, setAreYouSure }: Args) {
  // if this is a textBlock, let the textBlock/keymap handle the backspace
  if (isTextBlock[props.type]) return;
  let el = e.target as HTMLElement;
  if (
    el.tagName === "LABEL" ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.contentEditable === "true"
  )
    return;

  // if the block is a card or mailbox...
  if (props.type === "card" || props.type === "mailbox") {
    // ...and areYouSure state is false, set it to true
    if (!areYouSure) {
      setAreYouSure(true);
      return;
    }
    // ... and areYouSure state is true,
    // and the user is not in an input or textarea,
    // if there is a page to close, close it and remove the block
    if (areYouSure) {
      return deleteBlock([props.entityID].flat(), rep);
    }
  }

  e.preventDefault();
  rep.mutate.removeBlock({ blockEntity: props.entityID });
  useUIState.getState().closePage(props.entityID);
  let prevBlock = props.previousBlock;
  if (prevBlock) focusBlock(prevBlock, { type: "end" });
}

async function Enter({ props, rep, entity_set }: Args) {
  let newEntityID = v7();
  let position;
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
  useUIState.setState({ focusedEntity: null });
}
