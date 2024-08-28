"use client";

import { Fact, useEntity, useReplicache } from "src/replicache";
import { useEffect } from "react";
import { useUIState } from "src/useUIState";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useBlockMouseHandlers } from "./useBlockMouseHandlers";
import { useLongPress } from "src/hooks/useLongPress";
import { useEntitySetContext } from "components/EntitySetProvider";

import { isTextBlock } from "src/utils/isTextBlock";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { indent, outdent } from "src/utils/list-operations";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";

import { CheckboxChecked, CheckboxEmpty } from "components/Icons";
import { CollectionBlock } from "./CollectionBlock";
import { TextBlock } from "components/Blocks/TextBlock";
import { ImageBlock } from "./ImageBlock";
import { CardBlock } from "./CardBlock";
import { ExternalLinkBlock } from "./ExternalLinkBlock";
import { BlockOptions } from "./BlockOptions";
import { Block, BlockProps } from "./Block";

export type Block = {
  factID: string;
  parent: string;
  position: string;
  value: string;
  type: Fact<"block/type">["data"]["value"];
  listData?: {
    checklist?: boolean;
    path: { depth: number; entity: string }[];
    parent: string;
    depth: number;
  };
};
export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let blocks = useBlocks(props.entityID);
  let foldedBlocks = useUIState((s) => s.foldedBlocks);

  let lastRootBlock = blocks.findLast(
    (f) => !f.listData || f.listData.depth === 1,
  );

  let lastVisibleBlock = blocks.findLast(
    (f) =>
      !f.listData ||
      !f.listData.path.find(
        (path) => foldedBlocks.includes(path.entity) && f.value !== path.entity,
      ),
  );

  return (
    <div
      className={`blocks w-full flex flex-col outline-none h-fit min-h-full`}
      onClick={async (e) => {
        if (useUIState.getState().selectedBlock.length > 1) return;
        if (e.target === e.currentTarget) {
          if (
            !lastVisibleBlock ||
            (lastVisibleBlock.type !== "text" &&
              lastVisibleBlock.type !== "heading")
          ) {
            let newEntityID = v7();
            await rep.rep?.mutate.addBlock({
              parent: props.entityID,
              factID: v7(),
              permission_set: entity_set.set,
              type: "text",
              position: generateKeyBetween(
                lastRootBlock?.position || null,
                null,
              ),
              newEntityID,
            });

            setTimeout(() => {
              document
                .getElementById(elementId.block(newEntityID).text)
                ?.focus();
            }, 10);
          } else {
            lastVisibleBlock && focusBlock(lastVisibleBlock, { type: "end" });
          }
        }
      }}
    >
      {blocks
        .filter(
          (f) =>
            !f.listData ||
            !f.listData.path.find(
              (path) =>
                foldedBlocks.includes(path.entity) && f.value !== path.entity,
            ),
        )
        .map((f, index, arr) => {
          let nextBlock = arr[index + 1];
          let depth = f.listData?.depth || 1;
          let nextDepth = nextBlock?.listData?.depth || 1;
          let nextPosition: string | null;
          if (depth === 1 && !nextBlock?.listData)
            nextPosition = nextBlock?.position;
          else {
            if (depth === nextDepth) nextPosition = nextBlock?.position || null;
            else nextPosition = null;
          }
          return (
            <Block
              {...f}
              key={f.value}
              entityID={f.value}
              parent={props.entityID}
              previousBlock={arr[index - 1] || null}
              nextBlock={arr[index + 1] || null}
              nextPosition={nextPosition}
            />
          );
        })}
      <NewBlockButton
        lastBlock={lastRootBlock || null}
        entityID={props.entityID}
      />
      {entity_set.permissions.write ? (
        <div
          className="blocksBottomClickable shrink-0 h-[50vh]"
          onClick={() => {
            let newEntityID = v7();

            if (
              // if the last visible(not-folded) block is a text block, focus it
              lastRootBlock &&
              lastVisibleBlock &&
              isTextBlock[lastVisibleBlock.type]
            ) {
              focusBlock(
                { ...lastVisibleBlock, type: "text" },
                { type: "end" },
              );
            } else {
              // else add a new text block at the end and focus it
              rep?.rep?.mutate.addBlock({
                permission_set: entity_set.set,
                factID: v7(),
                parent: props.entityID,
                type: "text",
                position: generateKeyBetween(
                  lastRootBlock?.position || null,
                  null,
                ),
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
      ) : (
        <div className="h-4" />
      )}
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

export const ListMarker = (
  props: Block & { previousBlock?: Block | null; nextBlock?: Block | null } & {
    className?: string;
  },
) => {
  let checklist = useEntity(props.value, "block/check-list");
  let headingLevel = useEntity(props.value, "block/heading-level")?.data.value;
  let children = useEntity(props.value, "card/block");
  let folded =
    useUIState((s) => s.foldedBlocks.includes(props.value)) &&
    children.length > 0;

  let depth = props.listData?.depth;
  let { rep } = useReplicache();
  return (
    <div
      className={`shrink-0  flex gap-[8px] justify-end items-center h-3
                  ${props.className}
                  ${
                    props.type === "heading"
                      ? headingLevel === 3
                        ? "pt-[12px]"
                        : headingLevel === 2
                          ? "pt-[15px]"
                          : "pt-[20px]"
                      : "pt-[12px]"
                  }
            `}
      style={{
        width:
          depth &&
          `calc(${depth} * ${`var(--list-marker-width) ${checklist ? " + 20px" : ""} - 12px)`} `,
      }}
    >
      <button
        onClick={() => {
          if (children.length > 0)
            useUIState.getState().toggleFold(props.value);
        }}
        className={`listMarker group/list-marker ${children.length > 0 ? "cursor-pointer" : "cursor-default"}`}
      >
        <div
          className={`h-[5px] w-[5px] rounded-full bg-secondary shrink-0 right-0 outline outline-1  outline-offset-1
                      ${
                        folded
                          ? "outline-secondary"
                          : ` ${children.length > 0 ? "group-hover/list-marker:outline-secondary outline-transparent" : "outline-transparent"}`
                      }`}
        />
      </button>
      {checklist && (
        <button
          onClick={() => {
            rep?.mutate.assertFact({
              entity: props.value,
              attribute: "block/check-list",
              data: { type: "boolean", value: !checklist.data.value },
            });
          }}
          className={`${checklist?.data.value ? "text-accent-contrast" : "text-border"}`}
        >
          {checklist?.data.value ? <CheckboxChecked /> : <CheckboxEmpty />}
        </button>
      )}
    </div>
  );
};

const HeadingStyle = {
  1: "text-xl font-bold",
  2: "text-lg font-bold",
  3: "text-base font-bold text-secondary ",
} as { [level: number]: string };

export function HeadingBlock(props: BlockProps & { preview?: boolean }) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  return (
    <TextBlock
      {...props}
      previewOnly={props.preview}
      className={HeadingStyle[headingLevel?.data.value || 1]}
    />
  );
}
