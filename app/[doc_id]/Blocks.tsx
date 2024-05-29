"use client";
import { Fact, useEntity, useReplicache } from "../../replicache";
import {
  TextBlock,
  setEditorState,
  useEditorStates,
} from "../../components/TextBlock";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useMemo } from "react";
import { addImage } from "../../utils/addImage";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { useSubscribe } from "replicache-react";
import { elementId } from "../../utils/elementId";
import { TextSelection } from "prosemirror-state";
export const useUIState = create(
  combine({ selectedBlock: null as null | string }, (set) => ({
    setSelectedBlock: (block: string) =>
      set((state) => {
        return { ...state, selectedBlock: block };
      }),
  })),
);

export function AddBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <button
      onMouseDown={() => {
        rep?.rep?.mutate.addBlock({
          parent: props.entityID,
          type: "text",
          position: generateKeyBetween(null, blocks[0]?.data.position || null),
          newEntityID: crypto.randomUUID(),
        });
      }}
    >
      add block
    </button>
  );
}

export function AddImageBlock(props: { entityID: string }) {
  let rep = useReplicache();
  let blocks = useEntity(props.entityID, "card/block")?.sort((a, b) => {
    return a.data.position > b.data.position ? 1 : -1;
  });
  return (
    <input
      type="file"
      accept="image/*"
      onChange={async (e) => {
        let file = e.currentTarget.files?.[0];
        if (!file || !rep?.rep) return;
        await addImage(file, rep.rep, {
          parent: props.entityID,
          position: generateKeyBetween(null, blocks[0]?.data.position || null),
        });
      }}
    />
  );
}

export type Block = {
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
};
export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let initialValue = rep.initialFacts
    .filter((f) => f.attribute === "card/block")
    .map((_f) => {
      let block = _f as Fact<"card/block">;
      let type = rep.initialFacts.find(
        (f) => f.entity === block.data.value && f.attribute === "block/type",
      ) as Fact<"block/type"> | undefined;
      if (!type) return null;
      return { ...block.data, type: type.data.value };
    });
  let blocks =
    useSubscribe(rep?.rep, async (tx) => {
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

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-1 p-2">
      {blocks
        ?.flatMap((f) => (!f ? [] : [f]))
        ?.sort((a, b) => {
          return a.position > b.position ? 1 : -1;
        })
        .map((f, index, arr) => {
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
  let selected = useUIState((s) => s.selectedBlock === props.entityID);
  return (
    <div className={`border w-full`}>
      <div className={`p-2 border ${!selected ? "border-transparent" : ""}`}>
        {props.type === "text" ? (
          <TextBlock {...props} />
        ) : (
          <ImageBlock {...props} />
        )}
      </div>
    </div>
  );
}

function ImageBlock(props: BlockProps) {
  let rep = useReplicache();
  let image = useEntity(props.entityID, "block/image");
  let selected = useUIState((s) => s.selectedBlock === props.entityID);
  useEffect(() => {
    if (!selected || !rep.rep) return;
    let r = rep.rep;
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
    props.nextBlock,
    props.previousBlock,
    props.position,
    props.nextPosition,
    rep,
    props.parent,
  ]);

  return (
    <img
      alt={""}
      src={image?.data.src}
      height={image?.data.height}
      width={image?.data.width}
    />
  );
}

export function focusBlock(
  block: Block,
  left: number | "end",
  top: "top" | "bottom",
) {
  if (block.type === "image") {
    useUIState.getState().setSelectedBlock(block.value);
    return true;
  }
  let nextBlockID = block.value;
  let nextBlock = useEditorStates.getState().editorStates[nextBlockID];
  if (!nextBlock || !nextBlock.view) return;
  nextBlock.view.focus();
  let nextBlockViewClientRect = nextBlock.view.dom.getBoundingClientRect();
  let tr = nextBlock.editor.tr;
  if (left === "end") left = tr.doc.content.size - 1;
  let pos = nextBlock.view.posAtCoords({
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
