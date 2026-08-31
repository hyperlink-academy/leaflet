"use client";

import { useCallback, useRef, useState } from "react";
import {
  ClientRect,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useReplicache } from "src/replicache";
import { useFoldedBlocks } from "components/FoldStateProvider";
import { unfoldBlocks } from "src/utils/foldBlocks";
import {
  ListDropTarget,
  markListDragEnd,
  useListDragState,
} from "./ListDndState";
import { Block, BlockProps } from "./Block";

// Drag and drop reordering for list items. Each Block registers itself as a
// draggable (activated from its ListMarker by long press) and a droppable;
// this context computes where the drop would land, publishes it through
// useListDragState for the indicator line, and applies it as a single
// moveBlock mutation on drop.
export function ListDndContext(props: {
  pageID: string;
  // Visible blocks in document order — the same array the page maps over.
  blocks: Block[];
  children: React.ReactNode;
}) {
  let { rep } = useReplicache();
  let foldedBlocks = useFoldedBlocks();

  let sensors = useSensors(
    useSensor(PointerSensor, {
      // Long press. The OS long-press timeout isn't exposed to the web;
      // 250ms matches native drag-lift timing (and dnd-kit's recommended
      // touch delay) while a quick tap still falls through as a click.
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  let [active, setActive] = useState<BlockProps | null>(null);

  // The drop computation must agree with the collision pass on coordinates,
  // so the collision function stashes the pointer and droppable rects it was
  // given and onDragMove reads them back.
  let pointerRef = useRef<{ x: number; y: number } | null>(null);
  let rectsRef = useRef<Map<UniqueIdentifier, ClientRect> | null>(null);
  let dropRef = useRef<ListDropTarget | null>(null);
  // One horizontal indent unit, read from the theme at drag start.
  let indentWidthRef = useRef(38);
  let blocksRef = useRef(props.blocks);
  blocksRef.current = props.blocks;
  let foldedRef = useRef(foldedBlocks);
  foldedRef.current = foldedBlocks;

  let collisionDetection = useCallback<CollisionDetection>((args) => {
    pointerRef.current = args.pointerCoordinates;
    rectsRef.current = args.droppableRects;
    let within = pointerWithin(args);
    return within.length > 0 ? within : closestCenter(args);
  }, []);

  let onDragStart = ({ active: dragActive }: DragStartEvent) => {
    let arr = blocksRef.current;
    let index = arr.findIndex((b) => b.entityID === dragActive.id);
    let block = arr[index];
    if (!block?.listData) return;
    indentWidthRef.current =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--list-marker-width",
        ),
      ) || 38;
    // Build the same props the page's block map would pass, so the drag
    // preview renders the identical component.
    let nextBlock = arr[index + 1] || null;
    let nextDepth = nextBlock?.listData?.depth || 1;
    setActive({
      ...block,
      pageType: "doc",
      parent: props.pageID,
      previousBlock: arr[index - 1] || null,
      nextBlock,
      nextPosition:
        block.listData.depth === nextDepth ? nextBlock?.position || null : null,
    });
    useListDragState.setState({ activeId: block.entityID, dropTarget: null });
  };

  let onDragMove = ({ active: dragActive, over, delta }: DragMoveEvent) => {
    let target =
      over && pointerRef.current
        ? computeDropTarget(
            String(dragActive.id),
            String(over.id),
            pointerRef.current.y,
            delta.x,
            indentWidthRef.current,
            rectsRef.current?.get(over.id),
            blocksRef.current,
            props.pageID,
            foldedRef.current,
          )
        : null;
    dropRef.current = target;
    // Only publish when the target actually changes, so pointer movement
    // within the same gap doesn't re-render anything.
    if (!dropTargetEquals(useListDragState.getState().dropTarget, target))
      useListDragState.setState({ dropTarget: target });
  };

  let reset = () => {
    dropRef.current = null;
    setActive(null);
    markListDragEnd();
    useListDragState.setState({ activeId: null, dropTarget: null });
  };

  let onDragEnd = (_e: DragEndEvent) => {
    let target = dropRef.current;
    let activeBlock = active;
    reset();
    if (!rep || !target || !activeBlock?.listData) return;
    if (target.unfold) unfoldBlocks(rep, [target.unfold]);
    if (target.adopt && target.position.type === "after") {
      rep.mutate.moveBlockAdoptingSiblings({
        block: activeBlock.entityID,
        oldParent: activeBlock.listData.parent,
        newParent: target.newParent,
        after: target.position.entity,
        adoptParent: target.adopt.parent,
        adoptFrom: target.adopt.from,
      });
    } else {
      rep.mutate.moveBlock({
        block: activeBlock.entityID,
        oldParent: activeBlock.listData.parent,
        newParent: target.newParent,
        position: target.position,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
    >
      {props.children}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="listDragPreview scale-[1.02] drop-shadow-md">
            <Block {...active} preview />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function computeDropTarget(
  activeId: string,
  overId: string,
  pointerY: number,
  deltaX: number,
  indentWidth: number,
  overRect: ClientRect | undefined,
  blocks: Block[],
  pageID: string,
  foldedBlocks: readonly string[],
): ListDropTarget | null {
  if (!overRect) return null;
  let overIndex = blocks.findIndex((b) => b.entityID === overId);
  let activeIndex = blocks.findIndex((b) => b.entityID === activeId);
  let activeBlock = blocks[activeIndex];
  if (overIndex === -1 || !activeBlock?.listData) return null;

  let inActiveSubtree = (b: Block | undefined) =>
    !!b &&
    (b.entityID === activeId ||
      !!b.listData?.path.some((p) => p.entity === activeId));

  // Treat the document as if the dragged subtree were lifted out: the gaps on
  // either side of it collapse into its own slot, whose neighbors are the
  // blocks just outside the subtree. That makes the item's starting position
  // a valid target, so a purely horizontal drag projects an indent/outdent.
  let subtreeEnd = activeIndex;
  while (
    subtreeEnd + 1 < blocks.length &&
    inActiveSubtree(blocks[subtreeEnd + 1])
  )
    subtreeEnd++;
  let slotAbove = blocks[activeIndex - 1];
  let slotBelow = blocks[subtreeEnd + 1];

  let above: Block | undefined;
  let below: Block | undefined;
  let edge: "top" | "bottom" = "top";
  if (inActiveSubtree(blocks[overIndex])) {
    above = slotAbove;
    below = slotBelow;
  } else {
    edge = pointerY < overRect.top + overRect.height / 2 ? "top" : "bottom";
    above = edge === "top" ? blocks[overIndex - 1] : blocks[overIndex];
    below = edge === "top" ? blocks[overIndex] : blocks[overIndex + 1];
    if (inActiveSubtree(above)) above = slotAbove;
    if (inActiveSubtree(below)) below = slotBelow;
  }
  let ownSlot =
    (above?.entityID ?? null) === (slotAbove?.entityID ?? null) &&
    (below?.entityID ?? null) === (slotBelow?.entityID ?? null);
  let indicator = ownSlot
    ? { entityID: activeId, edge: "top" as const }
    : { entityID: overId, edge };

  // Horizontal drag distance projects the preferred depth (one indent unit
  // per level), clamped to what the gap allows: from one level above the item
  // below the line (a list split) down to one level under the item above it.
  let minDepth = below?.listData ? Math.max(1, below.listData.depth - 1) : 1;
  let maxDepth = above?.listData ? above.listData.depth + 1 : 1;
  let depth = Math.min(
    maxDepth,
    Math.max(
      minDepth,
      activeBlock.listData.depth + Math.round(deltaX / indentWidth),
    ),
  );
  // Back in its own slot at its own depth: not a move.
  if (ownSlot && depth === activeBlock.listData.depth) return null;

  if (below?.listData && depth === below.listData.depth)
    return {
      ...indicator,
      depth,
      newParent: below.listData.parent,
      position: { type: "before", entity: below.entityID },
    };
  if (below?.listData && depth === below.listData.depth - 1) {
    // One level above the run below the line: the dropped item splits the
    // list, landing after the run's parent and adopting the run as children,
    // which keeps the run's rendered depth. At the item's own slot this is
    // exactly a swipe-outdent.
    let splitParent = below.listData.parent;
    let newParent =
      depth === 1
        ? pageID
        : below.listData.path.find((p) => p.depth === depth - 1)?.entity;
    if (!newParent) return null;
    return {
      ...indicator,
      depth,
      newParent,
      position: { type: "after", entity: splitParent },
      adopt: { parent: splitParent, from: below.entityID },
      unfold: foldedBlocks.includes(activeId) ? activeId : undefined,
    };
  }
  if (above) {
    // Deeper than the item below: land inside the list context of the block
    // above. Its ancestor at `depth` is the sibling to follow; when there is
    // none (depth is one level under `above`) the item becomes its first
    // child.
    let newParent =
      depth === 1
        ? pageID
        : above.listData?.path.find((p) => p.depth === depth - 1)?.entity;
    if (!newParent) return null;
    let anchor = above.listData
      ? above.listData.path.find((p) => p.depth === depth)?.entity
      : above.entityID;
    // Landing as the first child of a collapsed `above`, or directly after a
    // folded heading (inside its hidden section), would put the block into
    // hidden content. Landing as a *sibling* after a folded list item is fine.
    let landsInHiddenContent =
      !anchor || (anchor === above.entityID && !above.listData);
    return {
      ...indicator,
      depth,
      newParent,
      position: anchor
        ? { type: "after", entity: anchor }
        : { type: "first" },
      unfold:
        landsInHiddenContent && foldedBlocks.includes(above.entityID)
          ? above.entityID
          : undefined,
    };
  }
  return {
    ...indicator,
    depth: 1,
    newParent: pageID,
    position: { type: "first" },
  };
}

function dropTargetEquals(a: ListDropTarget | null, b: ListDropTarget | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.entityID === b.entityID &&
    a.edge === b.edge &&
    a.depth === b.depth &&
    a.newParent === b.newParent &&
    a.position.type === b.position.type &&
    ("entity" in a.position ? a.position.entity : null) ===
      ("entity" in b.position ? b.position.entity : null) &&
    (a.adopt?.parent ?? null) === (b.adopt?.parent ?? null) &&
    (a.adopt?.from ?? null) === (b.adopt?.from ?? null) &&
    a.unfold === b.unfold
  );
}
