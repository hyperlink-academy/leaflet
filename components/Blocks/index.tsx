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
import { useBlockMouseHandlers } from "./useBlockMouseHandlers";
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

  let lastBlock = blocks.findLast((f) => !f.listData || f.listData.depth === 1);
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
              position: generateKeyBetween(lastBlock?.position || null, null),
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

          if (lastBlock && textBlocks[lastBlock.type]) {
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
  let type = useEntity(props.entityID, "block/type");
  let headingLevel = useEntity(props.entityID, "block/heading-level");

  if (!entity_set.permissions.write) return null;
  if (
    (props.lastBlock?.type === "text" || props.lastBlock?.type === "heading") &&
    (!editorState?.editor || editorState.editor.doc.content.size <= 2)
  )
    return null;
  return (
    <div className="flex items-center justify-between group/text px-3 sm:px-4">
      <div
        className="h-6 hover:cursor-text italic text-tertiary grow"
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
        {/* this is here as a fail safe, in case a new card is created and there are no blocks in it yet,
     we render a newcardbutton with a textblock-like placeholder instead of a proper first block. */}
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

  let first = props.previousBlock === null;

  let selectedBlocks = useUIState((s) => s.selectedBlock);

  let actuallySelected = useUIState(
    (s) => !!s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let selected =
    (!textBlocks[props.type] || selectedBlocks.length > 1) && actuallySelected;

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
    let listener = async (e: KeyboardEvent) => {
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
        if (props.type === "card") return;
        e.preventDefault();
        r.mutate.removeBlock({ blockEntity: props.entityID });
        useUIState.getState().closeCard(props.entityID);
        let block = props.previousBlock;
        if (block) focusBlock(block, { type: "end" });
      }
      if (e.key === "Enter") {
        if (!entity_set.permissions.write) return;
        let newEntityID = v7();
        let position;
        if (props.listData) {
          let hasChild =
            props.nextBlock?.listData &&
            props.nextBlock.listData.depth > props.listData.depth;
          position = generateKeyBetween(
            hasChild ? null : props.position,
            props.nextBlock?.position,
          );
          await r?.mutate.addBlock({
            newEntityID,
            factID: v7(),
            permission_set: entity_set.set,
            parent: hasChild ? props.entityID : props.listData.parent,
            type: "text",
            position,
          });
          await r?.mutate.assertFact({
            entity: newEntityID,
            attribute: "block/is-list",
            data: { type: "boolean", value: true },
          });
        }
        if (!props.listData) {
          position = generateKeyBetween(props.position, props.nextPosition);
          await r?.mutate.addBlock({
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
      if (e.key === "Escape") {
        e.preventDefault();
        useUIState.setState({ selectedBlock: [] });
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [entity_set, selected, props, rep]);
  let mouseHandlers = useBlockMouseHandlers(props);
  return (
    <div className="blockWrapper relative flex">
      {selected && selectedBlocks.length > 1 && (
        <div
          className={`
          blockSelectionBG pointer-events-none bg-border-light
          absolute right-2 left-2 bottom-0
          ${first ? "top-2" : "top-0"}
          ${!prevBlockSelected && "rounded-t-md"}
          ${!nextBlockSelected && "rounded-b-md"}
          `}
        />
      )}
      {props.listData && <ListMarker {...props} first={first} />}
      <div
        {...mouseHandlers}
        data-entityid={props.entityID}
        className={`blockContent relative grow flex flex-row
      ${
        props.type !== "heading" &&
        props.type !== "text" &&
        `${first ? "pt-3 sm:pt-4" : "pt-1"} px-3 sm:px-4 pb-2`
      }
      ${selectedBlocks.length > 1 ? "Multiple-Selected" : ""}
      ${actuallySelected ? "selected" : ""}
      `}
        id={elementId.block(props.entityID).container}
      >
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
    </div>
  );
}

export const ListMarker = (
  props: Block & { first?: boolean; className?: string; compact?: boolean },
) => {
  let headingLevel = useEntity(props.value, "block/heading-level")?.data.value;
  return (
    <>
      <div
        className="listMarker shrink-0 flex justify-end relative"
        style={{
          width:
            props.listData &&
            `calc(${props.listData.depth} * ${
              props.compact ? "16px" : `var(--list-marker-width))`
            }`,
        }}
      >
        <div
          className={` ${props.className} absolute h-[5px] w-[5px] rounded-full bg-secondary shrink-0  -right-1
      ${props.first ? "mt-1 sm:mt-2" : ""}
      ${
        props.type === "heading"
          ? headingLevel === 3
            ? "top-[13px]"
            : headingLevel === 2
              ? "top-[15px]"
              : "top-[20px]"
          : "top-[13px]"
      }`}
        />
      </div>
    </>
  );
};

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
