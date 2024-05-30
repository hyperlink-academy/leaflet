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
  let initialValue = useMemo(
    () =>
      rep.initialFacts
        .filter((f) => f.attribute === "card/block")
        .map((_f) => {
          let block = _f as Fact<"card/block">;
          let type = rep.initialFacts.find(
            (f) =>
              f.entity === block.data.value && f.attribute === "block/type",
          ) as Fact<"block/type"> | undefined;
          if (!type) return null;
          return { ...block.data, type: type.data.value };
        }),
    [rep.initialFacts],
  );
  let data =
    useSubscribe(rep?.rep, async (tx) => {
      let initialized = tx.get("initialized");
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
    <div className="mx-auto max-w-3xl flex flex-col gap-1 p-2">
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
    <button
      onMouseDown={async () => {
        let newEntityID = crypto.randomUUID();
        await rep?.mutate.addBlock({
          parent: props.entityID,
          type: "text",
          position: generateKeyBetween(props.lastBlock?.position || null, null),
          newEntityID,
        });

        setTimeout(() => {
          document.getElementById(elementId.block(newEntityID).text)?.focus();
        }, 10);
      }}
    >
      new block
    </button>
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
    <div
      id={elementId.block(props.entityID).container}
      className={`border w-full scroll-my-2`}
    >
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
      if (e.key === "Backspace") {
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
    props.previousBlock,
    props.position,
    props.nextPosition,
    rep,
    props.parent,
  ]);

  return (
    <img
      onClick={() => useUIState.getState().setSelectedBlock(props.entityID)}
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
