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
import { ReplicacheMutators, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { Replicache } from "replicache";

export function useBlockKeyboardHandlers(props: BlockProps) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();

  let selectedBlocks = useUIState((s) => s.selectedBlock);
  let actuallySelected = useUIState(
    (s) => !!s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let hasSelectionUI =
    (!isTextBlock[props.type] || selectedBlocks.length > 1) && actuallySelected;

  useEffect(() => {
    if (!hasSelectionUI || !rep) return;
    let r = rep;
    let listener = async (e: KeyboardEvent) => {
      // keymapping for textBlocks is handled in TextBlock/keymap
      if (e.defaultPrevented) return;
      //if no permissions, do nothing
      if (!entity_set.permissions.write) return;
      let command = { Tab, ArrowUp, ArrowDown, Backspace, Enter, Escape }[
        e.key
      ];
      command?.(e, props, r, entity_set);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [entity_set, hasSelectionUI, props, rep]);
}

function Tab(
  e: KeyboardEvent,
  props: BlockProps,
  rep: Replicache<ReplicacheMutators>,
) {
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

function ArrowDown(e: KeyboardEvent, props: BlockProps) {
  e.preventDefault();
  let nextBlock = props.nextBlock;
  if (nextBlock && useUIState.getState().selectedBlock.length <= 1)
    focusBlock(nextBlock, {
      type: "top",
      left: useEditorStates.getState().lastXPosition,
    });
  if (!nextBlock) return;
}

function ArrowUp(e: KeyboardEvent, props: BlockProps) {
  e.preventDefault();
  let prevBlock = props.previousBlock;
  if (prevBlock && useUIState.getState().selectedBlock.length <= 1) {
    focusBlock(prevBlock, {
      type: "bottom",
      left: useEditorStates.getState().lastXPosition,
    });
  }
  if (!prevBlock) return;
}

function Backspace(
  e: KeyboardEvent,
  props: BlockProps,
  rep: Replicache<ReplicacheMutators>,
) {
  if (isTextBlock[props.type]) return;
  if (props.type === "card" || props.type === "mailbox") return;
  e.preventDefault();
  rep.mutate.removeBlock({ blockEntity: props.entityID });
  useUIState.getState().closeCard(props.entityID);
  let prevBlock = props.previousBlock;
  if (prevBlock) focusBlock(prevBlock, { type: "end" });
}

async function Enter(
  e: KeyboardEvent,
  props: BlockProps,
  rep: Replicache<ReplicacheMutators>,
  entity_set: { set: string },
) {
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

function Escape(e: KeyboardEvent) {
  e.preventDefault();

  useUIState.setState({ selectedBlock: [] });
  useUIState.setState({ focusedBlock: null });
}
