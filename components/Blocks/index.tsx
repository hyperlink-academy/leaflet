"use client";

import { Fact, useEntity, useReplicache } from "src/replicache";

import { useUIState } from "src/useUIState";
import { isBlockHidden } from "src/replicache/getBlocks";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useEntitySetContext } from "components/EntitySetProvider";

import { isTextBlock } from "src/utils/isTextBlock";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";

import { Block } from "./Block";
import { useEffect, useMemo, useState } from "react";
import { addShortcut } from "src/shortcuts";
import { useHandleDrop } from "./useHandleDrop";
import { useFootnoteContext } from "components/Footnotes/FootnoteContext";

export function Blocks(props: { entityID: string }) {
  let rep = useReplicache();
  let isPageFocused = useUIState((s) => {
    let focusedElement = s.focusedEntity;
    let focusedPageID =
      focusedElement?.entityType === "page"
        ? focusedElement.entityID
        : focusedElement?.parent;
    return focusedPageID === props.entityID;
  });
  let { permissions } = useEntitySetContext();
  let entity_set = useEntitySetContext();
  let blocks = useBlocks(props.entityID);
  let foldedBlocks = useUIState((s) => s.foldedBlocks);
  let foldableHeadings = useMemo(
    () => new Set(blocks.flatMap((b) => b.headingPath ?? [])),
    [blocks],
  );
  useEffect(() => {
    if (!isPageFocused) return;
    return addShortcut([
      {
        altKey: true,
        metaKey: true,
        key: "ArrowUp",
        shift: true,
        handler: () => {
          let allParents = foldableParents(blocks);
          useUIState.setState((s) => {
            let foldedBlocks = [...s.foldedBlocks];
            allParents.forEach((p) => {
              if (!foldedBlocks.includes(p)) foldedBlocks.push(p);
            });
            return { foldedBlocks };
          });
        },
      },
      {
        altKey: true,
        metaKey: true,
        key: "ArrowDown",
        shift: true,
        handler: () => {
          let allParents = foldableParents(blocks);
          useUIState.setState((s) => {
            let foldedBlocks = [...s.foldedBlocks].filter(
              (f) => !allParents.includes(f),
            );
            return { foldedBlocks };
          });
        },
      },
    ]);
  }, [blocks, isPageFocused]);

  let lastRootBlock = blocks.findLast(
    (f) => !f.listData || f.listData.depth === 1,
  );

  let lastVisibleBlock = blocks.findLast(
    (f) => !isBlockHidden(f, foldedBlocks),
  );

  let { footnotes } = useFootnoteContext();

  let [areFootnotes, setAreFootnotes] = useState(false);

  useEffect(() => {
    setAreFootnotes(footnotes.length > 0);
  }, [footnotes.length]);

  return (
    <div
      className={`blocks w-full flex flex-col outline-hidden ${areFootnotes ? "h-fit" : "min-h-full"}`}
      onClick={async (e) => {
        if (!permissions.write) return;
        if (useUIState.getState().selectedBlocks.length > 1) return;
        if (e.target === e.currentTarget) {
          if (
            !lastVisibleBlock ||
            (lastVisibleBlock.type !== "text" &&
              lastVisibleBlock.type !== "heading")
          ) {
            // Appending lands after the last root block; if that sits inside a
            // folded heading section, unfold it so the new block is visible.
            lastRootBlock?.headingPath?.forEach((h) => {
              if (useUIState.getState().foldedBlocks.includes(h))
                useUIState.getState().toggleFold(h);
            });
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
        .filter((f) => !isBlockHidden(f, foldedBlocks))
        .map((f, index, arr) => {
          let nextBlock = arr[index + 1];
          let depth = f.listData?.depth || 1;
          let nextDepth = nextBlock?.listData?.depth || 1;
          let nextPosition: string | null;
          if (depth === nextDepth) nextPosition = nextBlock?.position || null;
          else nextPosition = null;
          return (
            <Block
              pageType="doc"
              {...f}
              key={f.value}
              entityID={f.value}
              parent={props.entityID}
              previousBlock={arr[index - 1] || null}
              nextBlock={arr[index + 1] || null}
              nextPosition={nextPosition}
              headingFoldable={foldableHeadings.has(f.value)}
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
        areFootnotes={areFootnotes}
      />
    </div>
  );
}

// Every foldable ancestor (list parents and enclosing headings) referenced by
// any block, deduped — the set fold-all/unfold-all toggles.
function foldableParents(blocks: Block[]): string[] {
  return blocks.reduce((acc, block) => {
    [
      ...(block.listData?.path.map((p) => p.entity) ?? []),
      ...(block.headingPath ?? []),
    ].forEach((p) => {
      if (!acc.includes(p)) acc.push(p);
    });
    return acc;
  }, [] as string[]);
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
        {/* this is here as a fail safe, in case a new page is created and there are no blocks in it yet,
     we render a newblockbutton with a textblock-like placeholder instead of a proper first block. */}
        {!props.lastBlock ? (
          <div className="pt-2 sm:pt-3">write something...</div>
        ) : (
          " "
        )}
      </div>
    </div>
  );
}

const BlockListBottom = (props: {
  lastRootBlock: Block | undefined;
  lastVisibleBlock: Block | undefined;
  entityID: string;
  areFootnotes: boolean;
}) => {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let handleDrop = useHandleDrop({
    parent: props.entityID,
    position: props.lastRootBlock?.position || null,
    nextPosition: null,
  });

  if (!entity_set.permissions.write) return;
  if (props.areFootnotes) return;

  return (
    <div
      className="blockListClickableBottomArea grow shrink-0 h-[50vh]"
      onClick={() => {
        let newEntityID = v7();
        if (
          // if the last visible(not-folded) block is a text block, focus it
          props.lastRootBlock &&
          props.lastVisibleBlock &&
          isTextBlock[props.lastVisibleBlock.type]
        ) {
          focusBlock(
            { ...props.lastVisibleBlock, type: "text" },
            { type: "end" },
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
              null,
            ),
            newEntityID,
          });

          setTimeout(() => {
            document.getElementById(elementId.block(newEntityID).text)?.focus();
          }, 10);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleDrop}
    />
  );
};
