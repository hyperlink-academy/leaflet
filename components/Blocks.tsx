"use client";
import { Fact, useEntity, useReplicache } from "src/replicache";
import {
  BlockOptions,
  TextBlock,
  setEditorState,
  useEditorStates,
} from "components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useMemo } from "react";
import { useSubscribe } from "replicache-react";
import { elementId } from "src/utils/elementId";
import { TextSelection } from "prosemirror-state";
import { useSelectingMouse } from "components/SelectionManager";
import { ImageBlock } from "./ImageBlock";
import { useUIState } from "src/useUIState";
import { focusCard } from "./Cards";

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
    <div className="w-full flex flex-col gap-1 p-2">
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
};

function Block(props: Block & BlockProps) {
  let selected = useUIState(
    (s) =>
      (props.type !== "text" || s.selectedBlock.length > 1) &&
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
        if (props.type === "text") return;
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
      className={`border ${!selected ? "border-transparent" : ""}`}
      id={elementId.block(props.entityID).container}
    >
      {props.type === "card" ? (
        <div
          className={`border w-full rounded-[4px]`}
          onClick={() => {
            useUIState.getState().openCard(props.parent, props.entityID);
            focusCard(props.entityID);
          }}
        >
          <div
            className={`p-2 rounded-[3px] border ${!selected ? "border-transparent" : ""}`}
          >
            a card{" "}
          </div>
        </div>
      ) : props.type === "text" ? (
        <TextBlock {...props} />
      ) : props.type === "image" ? (
        <ImageBlock {...props} />
      ) : null}
    </div>
  );
}

export function focusBlock(
  block: Block,
  left: number | "end" | "start",
  top: "top" | "bottom",
) {
  if (block.type === "image") {
    useUIState.getState().setSelectedBlock(block.value);
    return true;
  }
  document
    .getElementById(elementId.block(block.value).container)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        ? { pos: 0 }
        : nextBlock.view.posAtCoords({
            top:
              top === "top"
                ? nextBlockViewClientRect.top + 5
                : nextBlockViewClientRect.bottom - 5,
            left,
          });

  let newState = nextBlock.editor.apply(
    tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 0)),
  );

  setEditorState(nextBlockID, { editor: newState });
}
