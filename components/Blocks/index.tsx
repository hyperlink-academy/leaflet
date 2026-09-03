"use client";

import { Fact, useEntity, useReplicache } from "src/replicache";

import { useIsPageFocused, useUIState } from "src/useUIState";
import { foldBlocks, unfoldBlocks } from "src/utils/foldBlocks";
import { useFoldedBlocks } from "components/FoldStateProvider";
import { filterBlocksForZoom, isBlockHidden } from "src/replicache/getBlocks";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEditorStates } from "src/state/useEditorState";
import { useEntitySetContext } from "components/EntitySetProvider";

import { isTextBlock } from "src/utils/isTextBlock";
import { focusBlock } from "src/utils/focusBlock";
import { addBlockBelow, focusNewTextBlock } from "src/utils/addBlockBelow";

import { Block } from "./Block";
import { useEffect, useMemo, useState } from "react";
import { addShortcut } from "src/shortcuts";
import { useHandleDrop } from "./useHandleDrop";
import { listDndPages } from "./ListDndState";
import { useFootnoteContext } from "components/Footnotes/FootnoteContext";

export function Blocks(props: { entityID: string }) {
  let zoomedBlock = useUIState((s) => s.zoomedBlocks[props.entityID]);
  let isPageFocused = useIsPageFocused(props.entityID);
  let pageBlocks = useBlocks(props.entityID);
  let blocks = useMemo(
    () => filterBlocksForZoom(pageBlocks, zoomedBlock),
    [pageBlocks, zoomedBlock],
  );
  let { rep } = useReplicache();
  let foldedBlocks = useFoldedBlocks();
  let foldableParentSet = useMemo(() => foldableParents(blocks), [blocks]);
  // Folds on ancestors outside the zoomed view don't hide anything inside it.
  let visibleBlocks = useMemo(() => {
    let folded = foldedBlocks.filter((entity) => foldableParentSet.has(entity));
    return blocks.filter((block) => !isBlockHidden(block, folded));
  }, [blocks, foldedBlocks, foldableParentSet]);
  let zoomDepth = zoomedBlock ? blocks[0]?.listData?.depth : undefined;
  let hasBlocks = pageBlocks.length > 0;
  useEffect(() => {
    if (zoomedBlock && hasBlocks && zoomDepth === undefined)
      useUIState.getState().zoomOutOfBlock(props.entityID);
  }, [hasBlocks, props.entityID, zoomDepth, zoomedBlock]);
  useEffect(() => {
    if (!isPageFocused) return;
    return addShortcut([
      {
        altKey: true,
        metaKey: true,
        key: "ArrowUp",
        shift: true,
        handler: () => {
          foldBlocks(rep, [...foldableParentSet]);
        },
      },
      {
        altKey: true,
        metaKey: true,
        key: "ArrowDown",
        shift: true,
        handler: () => {
          unfoldBlocks(rep, [...foldableParentSet]);
        },
      },
    ]);
  }, [foldableParentSet, isPageFocused, rep]);

  let lastRootBlock = zoomedBlock
    ? blocks.findLast((block) => block.listData?.parent === zoomedBlock)
    : blocks.findLast((block) => !block.listData || block.listData.depth === 1);

  let lastVisibleBlock = visibleBlocks.at(-1);

  // Make this page a drop target for list items dragged from any open page
  // (the DndContext lives in ListDndProvider, above all pages).
  useEffect(() => {
    listDndPages.set(props.entityID, {
      pageID: props.entityID,
      blocks: visibleBlocks,
      zoomDepth,
    });
    return () => void listDndPages.delete(props.entityID);
  }, [props.entityID, visibleBlocks, zoomDepth]);

  let { footnotes } = useFootnoteContext();

  let [areFootnotes, setAreFootnotes] = useState(false);

  useEffect(() => {
    setAreFootnotes(footnotes.length > 0);
  }, [footnotes.length]);

  return (
    <div
      // flow-root, not flex-col: a flex container re-runs the flex algorithm
      // over every item when anything inside any one of them changes, so a
      // single keystroke cost a full-document layout that grew linearly with
      // block count (378ms/60 keystrokes at 3000 blocks, vs 156ms as flow-root).
      // flow-root rather than plain block so the first block's margin can't
      // collapse out through the container's top edge.
      className={`blocks w-full flow-root outline-hidden ${areFootnotes ? "h-fit" : "min-h-full"}`}
    >
      {visibleBlocks.map((f, index, arr) => {
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
            key={f.entityID}
            entityID={f.entityID}
            previousBlock={arr[index - 1] || null}
            nextBlock={arr[index + 1] || null}
            nextPosition={nextPosition}
            headingFoldable={foldableParentSet.has(f.entityID) && !f.listData}
            displayDepth={
              zoomDepth && f.listData
                ? f.listData.depth - zoomDepth + 1
                : undefined
            }
          />
        );
      })}
      <NewBlockButton
        lastBlock={lastRootBlock || null}
        entityID={zoomedBlock ?? props.entityID}
      />

      <BlockListBottom
        lastVisibleBlock={lastVisibleBlock || undefined}
        lastRootBlock={lastRootBlock || undefined}
        entityID={zoomedBlock ?? props.entityID}
        areFootnotes={areFootnotes}
      />
    </div>
  );
}

// Every foldable ancestor (list parents and enclosing headings) of any block
// that is itself in `blocks` — the set fold-all/unfold-all toggles.
function foldableParents(blocks: Block[]) {
  let blockIDs = new Set(blocks.map((block) => block.entityID));
  return new Set(
    blocks
      .flatMap((block) => [
        ...(block.listData?.path.slice(0, -1).map((p) => p.entity) ?? []),
        ...(block.headingPath ?? []),
      ])
      .filter((entity) => blockIDs.has(entity)),
  );
}

function NewBlockButton(props: { lastBlock: Block | null; entityID: string }) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  // Boolean selector so this doesn't re-render on every keystroke in the
  // last block.
  let lastBlockIsEmpty = useEditorStates((s) => {
    let editor =
      props.lastBlock?.type === "text"
        ? s.editorStates[props.lastBlock.entityID]?.editor
        : null;
    return !editor || editor.doc.content.size <= 2;
  });

  if (!entity_set.permissions.write) return null;
  if (
    (props.lastBlock?.type === "text" || props.lastBlock?.type === "heading") &&
    lastBlockIsEmpty
  )
    return null;
  return (
    <div className="flex items-center justify-between group/text px-3 sm:px-4">
      <div
        className="h-6 hover:cursor-text italic text-tertiary grow"
        onMouseDown={async () => {
          if (!rep) return;
          let newEntityID = await addBlockBelow(rep, {
            parent: props.entityID,
            position: props.lastBlock?.position || null,
            nextPosition: null,
            permission_set: entity_set.set,
            type: "text",
          });
          focusNewTextBlock(newEntityID);
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
      className="blockListClickableBottomArea grow min-h-[50vh]"
      onClick={() => {
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
        } else if (rep) {
          // else add a new text block at the end and focus it
          addBlockBelow(rep, {
            parent: props.entityID,
            position: props.lastRootBlock?.position || null,
            nextPosition: null,
            permission_set: entity_set.set,
            type: "text",
          }).then(focusNewTextBlock);
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
