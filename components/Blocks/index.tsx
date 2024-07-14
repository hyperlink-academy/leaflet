"use client";
import { Fact, useEntity, useReplicache } from "src/replicache";
import { TextBlock } from "components/Blocks/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect } from "react";
import { elementId } from "src/utils/elementId";
import { TextSelection } from "prosemirror-state";
import { useSelectingMouse } from "components/SelectionManager";
import { ImageBlock } from "./ImageBlock";
import { useUIState } from "src/useUIState";
import { CardBlock } from "./CardBlock";
import { ExternalLinkBlock } from "./ExternalLinkBlock";
import { BlockOptions } from "./BlockOptions";
import { getBlocksWithType, useBlocks } from "src/hooks/queries/useBlocks";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { useEntitySetContext } from "components/EntitySetProvider";
import { scanIndex } from "src/replicache/utils";
import { v7 } from "uuid";

export type Block = {
  factID: string;
  parent: string;
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
  listData?: {
    path: { depth: number; entity: string }[];
    parent: string;
    depth: number;
  };
};
export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let blocks = useBlocks(props.entityID);

  let lastBlock = blocks[blocks.length - 1];
  return (
    <div
      className="blocks w-full flex flex-col outline-none h-fit min-h-full pb-32"
      onClick={async (e) => {
        if (useUIState.getState().selectedBlock.length > 1) return;
        if (e.target === e.currentTarget) {
          if (
            !lastBlock ||
            (lastBlock.type !== "text" && lastBlock.type !== "heading")
          ) {
            let newEntityID = v7();
            await rep.rep?.mutate.addBlock({
              parent: props.entityID,
              factID: v7(),
              permission_set: entity_set.set,
              type: "text",
              position: generateKeyBetween(lastBlock.position || null, null),
              newEntityID,
            });

            setTimeout(() => {
              document
                .getElementById(elementId.block(newEntityID).text)
                ?.focus();
            }, 10);
          } else {
            focusBlock(lastBlock, { type: "end" });
          }
        }
      }}
    >
      {blocks.map((f, index, arr) => {
        return (
          <Block
            {...f}
            key={f.value}
            entityID={f.value}
            parent={props.entityID}
            previousBlock={arr[index - 1] || null}
            nextBlock={arr[index + 1] || null}
            nextPosition={arr[index + 1]?.position || null}
          />
        );
      })}
      <NewBlockButton lastBlock={lastBlock || null} entityID={props.entityID} />
      <div
        className="shrink-0 h-[50vh]"
        onClick={() => {
          let newEntityID = v7();

          if (lastBlock && lastBlock.type === "text") {
            focusBlock({ ...lastBlock, type: "text" }, { type: "end" });
          } else {
            rep?.rep?.mutate.addBlock({
              permission_set: entity_set.set,
              factID: v7(),
              parent: props.entityID,
              type: "text",
              position: generateKeyBetween(lastBlock?.position || null, null),
              newEntityID,
            });

            setTimeout(() => {
              document
                .getElementById(elementId.block(newEntityID).text)
                ?.focus();
            }, 10);
          }
        }}
      />
    </div>
  );
}

function NewBlockButton(props: { lastBlock: Block | null; entityID: string }) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let editorState = useEditorStates((s) =>
    props.lastBlock?.type === "text"
      ? s.editorStates[props.lastBlock.value]
      : null,
  );
  if (!entity_set.permissions.write) return null;
  if (
    (props.lastBlock?.type === "text" || props.lastBlock?.type === "heading") &&
    (!editorState?.editor || editorState.editor.doc.content.size <= 2)
  )
    return null;
  return (
    <div className="relative group/text px-2 sm:px-3">
      <div
        className="h-6 hover:cursor-text italic text-tertiary"
        onMouseDown={async () => {
          let newEntityID = v7();
          await rep?.mutate.addBlock({
            parent: props.entityID,
            type: "text",
            factID: v7(),
            permission_set: entity_set.set,
            position: generateKeyBetween(
              props.lastBlock?.position || null,
              null,
            ),
            newEntityID,
          });

          setTimeout(() => {
            document.getElementById(elementId.block(newEntityID).text)?.focus();
          }, 10);
        }}
      >
        {!props.lastBlock ? (
          <div className="pt-2 sm:pt-3">write something...</div>
        ) : (
          " "
        )}
      </div>
      <BlockOptions
        parent={props.entityID}
        entityID={null}
        position={props.lastBlock?.position || null}
        nextPosition={null}
        first={!props.lastBlock}
      />
    </div>
  );
}

export type BlockProps = {
  entityID: string;
  parent: string;
  position: string;
  nextBlock: Block | null;
  previousBlock: Block | null;
  nextPosition: string | null;
} & Block;

let textBlocks: { [k in Fact<"block/type">["data"]["value"]]?: boolean } = {
  text: true,
  heading: true,
};

function Block(props: BlockProps) {
  let { rep } = useReplicache();

  let selectedBlocks = useUIState((s) => s.selectedBlock);

  let selected = useUIState(
    (s) =>
      (!textBlocks[props.type] || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );

  let nextBlockSelected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.nextBlock?.value),
  );
  let prevBlockSelected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.previousBlock?.value),
  );

  let entity_set = useEntitySetContext();
  useEffect(() => {
    if (!selected || !rep) return;
    let r = rep;
    let listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        let block = props.nextBlock;
        if (block && useUIState.getState().selectedBlock.length <= 1)
          focusBlock(block, {
            type: "top",
            left: useEditorStates.getState().lastXPosition,
          });
        if (!block) return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        let block = props.previousBlock;
        if (block && useUIState.getState().selectedBlock.length <= 1) {
          focusBlock(block, {
            type: "bottom",
            left: useEditorStates.getState().lastXPosition,
          });
        }
        if (!block) return;
      }
      if (e.key === "Backspace") {
        if (!entity_set.permissions.write) return;
        if (textBlocks[props.type]) return;
        e.preventDefault();
        r.mutate.removeBlock({ blockEntity: props.entityID });
        useUIState.getState().closeCard(props.entityID);
        let block = props.previousBlock;
        if (block) focusBlock(block, { type: "end" });
      }
      if (e.key === "Enter") {
        let newEntityID = v7();
        if (!entity_set.permissions.write) return;
        r.mutate.addBlock({
          permission_set: entity_set.set,
          newEntityID,
          factID: v7(),
          parent: props.parent,
          type: "text",
          position: generateKeyBetween(props.position, props.nextPosition),
        });
        setTimeout(() => {
          document.getElementById(elementId.block(newEntityID).text)?.focus();
        }, 10);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        useUIState.setState({ selectedBlock: [] });
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    entity_set,
    selected,
    props.entityID,
    props.nextBlock,
    props.type,
    props.previousBlock,
    props.position,
    props.nextPosition,
    rep,
    props.parent,
  ]);
  return (
    <div
      data-entityid={props.entityID}
      onMouseDown={(e) => {
        useSelectingMouse.setState({ start: props.entityID });
        if (e.shiftKey) {
          e.preventDefault();
          useUIState.getState().addBlockToSelection(props);
        } else useUIState.getState().setSelectedBlock(props);
      }}
      onMouseEnter={async (e) => {
        if (!entity_set.permissions.write) return;
        if (e.buttons !== 1) return;
        let selection = useSelectingMouse.getState();
        if (!selection.start) return;
        let siblings =
          (await rep?.query((tx) => getBlocksWithType(tx, props.parent))) || [];
        let startIndex = siblings.findIndex((b) => b.value === selection.start);
        if (startIndex === -1) return;
        let endIndex = siblings.findIndex((b) => b.value === props.entityID);
        let start = Math.min(startIndex, endIndex);
        let end = Math.max(startIndex, endIndex);
        let selected = siblings.slice(start, end + 1).map((b) => ({
          value: b.value,
          position: b.position,
          parent: props.parent,
        }));
        useUIState.getState().setSelectedBlocks(selected);
      }}
      // text and heading blocks handle thier own padding so that
      // clicking anywhere on them (even the padding between blocks) will focus the textarea
      className={` relative ${
        props.type !== "heading" &&
        props.type !== "text" &&
        `border-l-4 first:pt-2 sm:first:pt-3 pl-1 sm:pl-2 pr-2 sm:pr-3 pt-1 pb-2 ${selected ? "border-tertiary" : "border-transparent"}`
      }
      flex flex-row
      `}
      id={elementId.block(props.entityID).container}
    >
      {selected && selectedBlocks.length > 1 && (
        <div
          className={`
            textSelection pointer-events-none
            absolute right-2 left-2 bg-border-light
            ${!props.previousBlock ? "top-2" : "top-0"}
            ${props.type !== "heading" && !nextBlockSelected ? "bottom-1" : "bottom-0"}
            ${!prevBlockSelected && "rounded-t-md"}
            ${!nextBlockSelected && "rounded-b-md"}
            `}
        />
      )}
      {props.listData && (
        <>
          <div style={{ width: props.listData.depth * 32 }}></div> *
        </>
      )}
      {props.type === "card" ? (
        <CardBlock {...props} />
      ) : props.type === "text" ? (
        <TextBlock {...props} className="" />
      ) : props.type === "heading" ? (
        <HeadingBlock {...props} />
      ) : props.type === "image" ? (
        <ImageBlock {...props} />
      ) : props.type === "link" ? (
        <ExternalLinkBlock {...props} />
      ) : null}
    </div>
  );
}

const HeadingStyle = {
  1: "text-xl font-bold",
  2: "text-lg font-bold",
  3: "text-base font-bold text-secondary ",
} as { [level: number]: string };
export function HeadingBlock(props: BlockProps) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  return (
    <TextBlock
      {...props}
      className={HeadingStyle[headingLevel?.data.value || 1]}
    />
  );
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
export function focusBlock(
  block: Pick<Block, "type" | "value" | "parent">,
  position: Position,
) {
  if (block.type !== "text" && block.type !== "heading") {
    useUIState.getState().setSelectedBlock(block);
    return true;
  }
  let nextBlockID = block.value;
  let nextBlock = useEditorStates.getState().editorStates[nextBlockID];
  if (!nextBlock || !nextBlock.view) return;
  nextBlock.view.dom.focus({ preventScroll: true });
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

  let newState = nextBlock.editor.apply(
    tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 0)),
  );

  setEditorState(nextBlockID, { editor: newState });
}
