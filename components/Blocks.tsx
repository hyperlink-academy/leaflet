"use client";
import { Fact, useEntity, useReplicache } from "src/replicache";
import {
  TextBlock,
  setEditorState,
  useEditorStates,
} from "components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSubscribe } from "replicache-react";
import { elementId } from "src/utils/elementId";
import { TextSelection } from "prosemirror-state";
import { useSelectingMouse } from "components/SelectionManager";
import { ImageBlock } from "./ImageBlock";
import { useUIState } from "src/useUIState";
import { CardBlock } from "./CardBlock";
import { ExternalLinkBlock } from "./ExternalLinkBlock";
import { BlockOptions } from "./BlockOptions";

export type Block = {
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
};
export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let initialValue = useMemo(
    () =>
      rep.initialFacts
        .filter(
          (f) => f.attribute === "card/block" && f.entity === props.entityID,
        )
        .map((_f) => {
          let block = _f as Fact<"card/block">;
          let type = rep.initialFacts.find(
            (f) =>
              f.entity === block.data.value && f.attribute === "block/type",
          ) as Fact<"block/type"> | undefined;
          if (!type) return null;
          return { ...block.data, type: type.data.value };
        }),
    [rep.initialFacts, props.entityID],
  );
  let data =
    useSubscribe(rep?.rep, async (tx) => {
      let initialized = await tx.get("initialized");
      if (!initialized) return null;
      let blocks = await tx
        .scan<
          Fact<"card/block">
        >({ indexName: "eav", prefix: `${props.entityID}-card/block` })
        .toArray();

      return Promise.all(
        blocks.map(async (b) => {
          let type = (
            await tx
              .scan<
                Fact<"block/type">
              >({ prefix: `${b.data.value}-block/type`, indexName: "eav" })
              .toArray()
          )[0];
          if (!type) return null;
          return { ...b.data, type: type.data.value } as Block;
        }),
      );
    }) || initialValue;
  let blocks = data
    .flatMap((f) => (!f ? [] : [f]))
    .sort((a, b) => {
      return a.position > b.position ? 1 : -1;
    });

  let lastBlock = blocks[blocks.length - 1];
  return (
    <div
      className="blocks w-full flex flex-col pt-2 sm:pt-3 outline-none h-fit pb-32"
      onClick={async (e) => {
        if (useUIState.getState().selectedBlock.length > 1) return;
        if (e.target === e.currentTarget) {
          if (
            !lastBlock ||
            (lastBlock.type !== "text" && lastBlock.type !== "heading")
          ) {
            let newEntityID = crypto.randomUUID();
            await rep.rep?.mutate.addBlock({
              parent: props.entityID,
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
            focusBlock(lastBlock, "end", "bottom");
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
    </div>
  );
}

function NewBlockButton(props: { lastBlock: Block | null; entityID: string }) {
  let { rep } = useReplicache();
  let textContent = useEntity(
    props.lastBlock?.type === "text" ? props.lastBlock.value : null,
    "block/text",
  );
  if (
    props.lastBlock?.type === "text" &&
    (!textContent || textContent.data.value === "")
  )
    return null;
  return (
    <div className="relative group/text mx-2 sm:mx-3">
      <div
        className="h-full hover:cursor-text italic p-1 text-tertiary"
        onMouseDown={async () => {
          let newEntityID = crypto.randomUUID();
          await rep?.mutate.addBlock({
            parent: props.entityID,
            type: "text",
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
        {!props.lastBlock ? "write something..." : " "}
      </div>
      <BlockOptions
        parent={props.entityID}
        entityID={null}
        position={props.lastBlock?.position || null}
        nextPosition={null}
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
  let selected = useUIState(
    (s) =>
      (!textBlocks[props.type] || s.selectedBlock.length > 1) &&
      s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let { rep } = useReplicache();

  useEffect(() => {
    if (!selected || !rep) return;
    let r = rep;
    let listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        let block = props.nextBlock;
        if (block && useUIState.getState().selectedBlock.length <= 1)
          focusBlock(block, useEditorStates.getState().lastXPosition, "top");
        if (!block) return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        let block = props.previousBlock;
        if (block && useUIState.getState().selectedBlock.length <= 1) {
          focusBlock(block, useEditorStates.getState().lastXPosition, "bottom");
        }
        if (!block) return;
      }
      if (e.key === "Backspace") {
        if (textBlocks[props.type]) return;
        e.preventDefault();
        r.mutate.removeBlock({ blockEntity: props.entityID });
        useUIState.getState().closeCard(props.entityID);
        let block = props.previousBlock;
        if (block) focusBlock(block, "end", "bottom");
      }
      if (e.key === "Enter") {
        let newEntityID = crypto.randomUUID();
        r.mutate.addBlock({
          newEntityID,
          parent: props.parent,
          type: "text",
          position: generateKeyBetween(props.position, props.nextPosition),
        });
        setTimeout(() => {
          document.getElementById(elementId.block(newEntityID).text)?.focus();
        }, 10);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
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
        if (e.shiftKey) {
          e.preventDefault();
          useUIState.getState().addBlockToSelection(props);
        } else useUIState.getState().setSelectedBlock(props);
      }}
      onMouseEnter={(e) => {
        let selection = useSelectingMouse.getState();
        if (!selection.start) return;
        useUIState.getState().addBlockToSelection(props);
      }}
      onMouseLeave={(e) => {
        let selection = useSelectingMouse.getState();
        if (!selection.start) return;
        let rect = e.currentTarget.getBoundingClientRect();
        let topMin = Math.min(selection.start.top, e.clientY);
        let topMax = Math.max(selection.start.top, e.clientY);
        if (rect.top >= topMin && rect.top < topMax) {
          return;
        }

        if (rect.bottom > topMin && rect.bottom <= topMax) {
          return;
        }
        useUIState.getState().removeBlockFromSelection(props);
      }}
      className={`rounded-md p-1 first:mt-0 mx-1 sm:mx-2 ${
        !selected ? "" : "bg-border-light"
      } ${props.type === "heading" ? "mt-1 mb-0" : "mb-2"}`}
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
  );
}

const HeadingStyle = {
  1: "text-xl font-bold",
  2: "text-lg font-bold ",
  3: "text-base font-bold italic text-secondary ",
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

export function focusBlock(
  block: Block,
  left: number | "end" | "start",
  top: "top" | "bottom",
) {
  console.log("focusin block");
  // if the block is below a certain y position, scroll it to that y position
  if (block.type !== "text" && block.type !== "heading") {
    useUIState.getState().setSelectedBlock(block);
    return true;
  }
  let nextBlockID = block.value;
  let nextBlock = useEditorStates.getState().editorStates[nextBlockID];
  if (!nextBlock || !nextBlock.view) return;
  nextBlock.view.focus();
  let nextBlockViewClientRect = nextBlock.view.dom.getBoundingClientRect();
  let tr = nextBlock.editor.tr;
  let pos =
    left === "end"
      ? { pos: tr.doc.content.size - 1 }
      : left === "start"
        ? { pos: 1 }
        : nextBlock.view.posAtCoords({
            top:
              top === "top"
                ? nextBlockViewClientRect.top + 2
                : nextBlockViewClientRect.bottom - 2,
            left,
          });

  let newState = nextBlock.editor.apply(
    tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 0)),
  );

  setEditorState(nextBlockID, { editor: newState });
}
