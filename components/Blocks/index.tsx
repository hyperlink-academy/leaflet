"use client";

import { Fact, useReplicache } from "src/replicache";

import { useUIState } from "src/useUIState";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useEntitySetContext } from "components/EntitySetProvider";

import { isTextBlock } from "src/utils/isTextBlock";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";

import { BlockOptions } from "./BlockOptions";
import { Block } from "./Block";

export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let blocks = useBlocks(props.entityID);
  let foldedBlocks = useUIState((s) => s.foldedBlocks);

  let lastRootBlock = blocks.findLast(
    (f) => !f.listData || f.listData.depth === 1
  );

  let lastVisibleBlock = blocks.findLast(
    (f) =>
      !f.listData ||
      !f.listData.path.find(
        (path) => foldedBlocks.includes(path.entity) && f.value !== path.entity
      )
  );

  return (
    <div
      className={`blocks w-full flex flex-col outline-none h-fit min-h-full`}
      onClick={async (e) => {
        if (useUIState.getState().selectedBlocks.length > 1) return;
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
                null
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
                foldedBlocks.includes(path.entity) && f.value !== path.entity
            )
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

      <BlockListBottom
        lastVisibleBlock={lastVisibleBlock || undefined}
        lastRootBlock={lastRootBlock || undefined}
        entityID={props.entityID}
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
      : null
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
              null
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

const BlockListBottom = (props: {
  lastRootBlock: Block | undefined;
  lastVisibleBlock: Block | undefined;
  entityID: string;
}) => {
  let newEntityID = v7();
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();

  if (!entity_set.permissions.write) return <div className="h-4 min-h-4" />;
  return (
    <div
      className="blockListClickableBottomArea shrink-0 h-[50vh]"
      onClick={() => {
        if (
          // if the last visible(not-folded) block is a text block, focus it
          props.lastRootBlock &&
          props.lastVisibleBlock &&
          isTextBlock[props.lastVisibleBlock.type]
        ) {
          focusBlock(
            { ...props.lastVisibleBlock, type: "text" },
            { type: "end" }
          );
        } else {
          // else add a new text block at the end and focus it
          rep?.mutate.addBlock({
            permission_set: entity_set.set,
            factID: v7(),
            parent: props.entityID,
            type: "text",
            position: generateKeyBetween(
              props.lastRootBlock?.position || null,
              null
            ),
            newEntityID,
          });

          setTimeout(() => {
            document.getElementById(elementId.block(newEntityID).text)?.focus();
          }, 10);
        }
      }}
    />
  );
};
