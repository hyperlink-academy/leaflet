"use client";
import { Fact, useEntity, useReplicache } from "src/replicache";
import {
  BlockOptions,
  TextBlock,
  setEditorState,
  useEditorStates,
} from "components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSubscribe } from "replicache-react";
import { elementId } from "src/utils/elementId";
import { TextSelection } from "prosemirror-state";
import {
  restoreSelection,
  saveSelection,
  useSelectingMouse,
} from "components/SelectionManager";
import { ImageBlock } from "./ImageBlock";
import { useUIState } from "src/useUIState";
import { focusCard } from "./Cards";
import { CardBlock } from "./CardBlock";
import { useIsMobile } from "src/hooks/isMobile";

export type Block = {
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
};
interface ReplayedKeyboardEvent extends KeyboardEvent {
  replayed: boolean;
}

interface ReplayedPointerEvent extends PointerEvent {
  replayed: boolean;
}
let skip = false;
export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let ref = useRef<HTMLDivElement | null>(null);
  let previous = useRef("None");
  let isMobile = useIsMobile();
  useEffect(() => {
    if (!isMobile) return;
    let selectionChangeHandler = () => {
      if (skip == true) return;
      let selection = window.getSelection();

      let ranges;
      if (previous.current !== selection?.type) {
        ranges = saveSelection();
      }
      if (selection?.type === "Range") {
        if (ref.current) ref.current.contentEditable = "true";
        let range = selection.getRangeAt(0);
        if (range.startContainer !== range.endContainer) {
          let contents = range.cloneContents();
          let entityIDs: string[] = [];
          for (let child of contents.children) {
            let entityID = child.getAttribute("data-entityid");
            if (entityID && child.textContent !== "") entityIDs.push(entityID);
          }
          useUIState.getState().setSelectedBlocks(entityIDs);
        } else {
          let entityid =
            range.startContainer.parentElement?.parentElement?.parentElement?.parentElement?.getAttribute(
              "data-entityid",
            );
          if (entityid)
            useUIState.setState((s) => ({ focusedTextBlock: entityid }));
        }
      } else {
        if (ref.current) ref.current.contentEditable = "false";
      }
      if (previous.current !== selection?.type) {
        if (ranges) restoreSelection(ranges);
      }
      previous.current = selection?.type || "None";
    };
    let keyDownHandler = (e: KeyboardEvent) => {
      skip = true;
      let selection = window.getSelection();
      if (selection?.type !== "Range") return;
      if ((e as ReplayedKeyboardEvent).replayed) {
        skip = false;
        return;
      }
      e.stopPropagation();

      let ranges = saveSelection();
      if (ref.current) ref.current.contentEditable = "false";
      restoreSelection(ranges);
      let newEvent = new KeyboardEvent(e.type, {
        ...e,
      }) as ReplayedKeyboardEvent;
      newEvent.replayed = true;
      e.target?.dispatchEvent(newEvent);
    };

    let pointerDownHandler = (e: PointerEvent) => {
      skip = true;
      let selection = window.getSelection();
      if (selection?.type !== "Range") return;
      if ((e as ReplayedPointerEvent).replayed) {
        skip = false;
        return;
      }
      e.stopPropagation();

      let ranges = saveSelection();
      if (ref.current) ref.current.contentEditable = "false";
      restoreSelection(ranges);
      let newEvent = new PointerEvent(e.type, {
        ...e,
      }) as ReplayedPointerEvent;
      newEvent.replayed = true;
      e.target?.dispatchEvent(newEvent);
    };
    document.addEventListener("selectionchange", selectionChangeHandler);
    document.addEventListener("keydown", keyDownHandler, true);
    document.addEventListener("pointerdown", pointerDownHandler, true);
    let pointerUp = () => {
      if (useUIState.getState().selectedBlock.length > 1)
        window.getSelection()?.removeAllRanges();
    };
    window.addEventListener("pointerup", pointerUp);
    return () => {
      window.removeEventListener("pointerup", pointerUp);
      document.removeEventListener("keydown", keyDownHandler, true);
      document.removeEventListener("pointerdown", pointerDownHandler, true);
      document.removeEventListener("selectionchange", selectionChangeHandler);
    };
  }, [isMobile]);
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
      ref={ref}
      className="w-full flex flex-col p-3 sm:p-4 outline-none h-full"
      onClick={(e) => {
        if (e.target === e.currentTarget)
          useUIState.setState(() => ({
            focusedBlock: { type: "card", entityID: props.entityID },
          }));
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
    <div className="relative w-full group/text">
      <div
        className="w-full h-full hover:cursor-text"
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
        &nbsp;
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
      s.selectedBlock.includes(props.entityID),
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
        if (block)
          focusBlock(block, useEditorStates.getState().lastXPosition, "top");
        if (!block) return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        let block = props.previousBlock;
        if (block)
          focusBlock(block, useEditorStates.getState().lastXPosition, "bottom");
        if (!block) return;
      }
      if (e.key === "Backspace") {
        if (textBlocks[props.type]) return;
        e.preventDefault();
        r.mutate.removeBlock({ blockEntity: props.entityID });
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
          useUIState.getState().addBlockToSelection(props.entityID);
        } else useUIState.getState().setSelectedBlock(props.entityID);
      }}
      onMouseEnter={(e) => {
        let selection = useSelectingMouse.getState();
        if (!selection.start) return;
        useUIState.getState().addBlockToSelection(props.entityID);
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
        useUIState.getState().removeBlockFromSelection(props.entityID);
      }}
      className={`border  first:mt-0 ${!selected ? "border-transparent" : ""} ${
        props.type === "text"
          ? "mb-3"
          : props.type === "heading"
            ? "mt-2 mb-1"
            : "mb-3"
      }`}
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
  block: Omit<Block, "position">,
  left: number | "end" | "start",
  top: "top" | "bottom",
) {
  document
    .getElementById(elementId.block(block.value).container)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (block.type === "image" || block.type === "card") {
    useUIState.getState().setSelectedBlock(block.value);
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
  console.log(pos);

  let newState = nextBlock.editor.apply(
    tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 0)),
  );

  setEditorState(nextBlockID, { editor: newState });
}
