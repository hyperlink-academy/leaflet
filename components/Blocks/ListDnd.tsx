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
import { getEventCoordinates } from "@dnd-kit/utilities";
import { Replicache } from "replicache";
import { ReplicacheMutators, useReplicache } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { elementId } from "src/utils/elementId";
import { useFoldedBlocks } from "components/FoldStateProvider";
import { unfoldBlocks } from "src/utils/foldBlocks";
import {
  ListDndPage,
  ListDropTarget,
  findListDndPageForBlock,
  markListDragEnd,
  useListDragState,
} from "./ListDndState";
import { Block, BlockProps } from "./Block";

// Drag and drop reordering for list items. Each Block registers itself as a
// draggable (activated from its ListMarker by long press) and a droppable,
// and each page's Blocks registers its visible block list (see ListDndState).
// This provider mounts once above all open pages, so an item can be dropped
// into any of them: it computes where the drop would land, publishes it
// through useListDragState for the indicator line, and applies it as a single
// mutation on drop.
export function ListDndProvider(props: { children: React.ReactNode }) {
  let { rep } = useReplicache();
  let foldedBlocks = useFoldedBlocks();

  let sensors = useSensors(
    useSensor(PointerSensor, {
      // The drag starts on whichever comes first: a 250ms hold (the OS
      // long-press timeout isn't exposed to the web; 250ms matches native
      // drag-lift timing and dnd-kit's recommended touch delay) or 8px of
      // pointer travel. A quick clean tap still falls through as a click.
      // dnd-kit reuses the one tolerance field as a movement-cancel in both
      // constraint branches, and checks it before the distance start — the
      // sentinel keeps any finite movement resolving as a drag start, never
      // a cancel.
      activationConstraint: {
        delay: 250,
        distance: 8,
        tolerance: Number.MAX_SAFE_INTEGER,
      },
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
  // Where on its own row the drag started (pointer x minus the row's left
  // edge). Depth projection measures horizontal travel against the hovered
  // row's left edge relative to this, which equals plain pointer delta within
  // one page but stays meaningful across side-by-side pages — raw delta would
  // absorb the whole page-to-page distance and pin cross-page drops to the
  // clamp.
  let startRelXRef = useRef(0);
  // The dragged block and the page it came from, set synchronously at drag
  // start so the move handlers never race the re-render.
  let activeRef = useRef<Block | null>(null);
  let activePageRef = useRef<string | null>(null);
  // Pages living inside the dragged subtree (via its page-link blocks):
  // dropping into one would make the block a descendant of itself. Resolved
  // asynchronously at drag start; until then cross-page drops are withheld.
  let forbiddenPagesRef = useRef<Set<string> | null>(null);
  let foldedRef = useRef(foldedBlocks);
  foldedRef.current = foldedBlocks;

  let collisionDetection = useCallback<CollisionDetection>((args) => {
    pointerRef.current = args.pointerCoordinates;
    rectsRef.current = args.droppableRects;
    let within = pointerWithin(args);
    return within.length > 0 ? within : closestCenter(args);
  }, []);

  let onDragStart = ({
    active: dragActive,
    activatorEvent,
  }: DragStartEvent) => {
    let page = findListDndPageForBlock(String(dragActive.id));
    if (!page) return;
    let arr = page.blocks;
    let index = arr.findIndex((b) => b.entityID === dragActive.id);
    let block = arr[index];
    if (!block?.listData) return;
    let rowLeft =
      document
        .getElementById(elementId.block(block.entityID).container)
        ?.getBoundingClientRect().left ?? 0;
    startRelXRef.current =
      (getEventCoordinates(activatorEvent)?.x ?? rowLeft) - rowLeft;
    indentWidthRef.current =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--list-marker-width",
        ),
      ) || 38;
    activeRef.current = block;
    activePageRef.current = page.pageID;
    forbiddenPagesRef.current = null;
    if (rep)
      getDescendantPages(rep, block.entityID).then((pages) => {
        forbiddenPagesRef.current = pages;
      });
    // Build the same props the page's block map would pass, so the drag
    // preview renders the identical component.
    let nextBlock = arr[index + 1] || null;
    let nextDepth = nextBlock?.listData?.depth || 1;
    setActive({
      ...block,
      pageType: "doc",
      previousBlock: arr[index - 1] || null,
      nextBlock,
      nextPosition:
        block.listData.depth === nextDepth ? nextBlock?.position || null : null,
      displayDepth: page.zoomDepth
        ? block.listData.depth - page.zoomDepth + 1
        : undefined,
    });
    useListDragState.setState({ activeId: block.entityID, dropTarget: null });
  };

  let onDragMove = ({ over }: DragMoveEvent) => {
    let activeBlock = activeRef.current;
    let page = over ? findListDndPageForBlock(String(over.id)) : undefined;
    let crossPage = !!page && page.pageID !== activePageRef.current;
    let target =
      over &&
      pointerRef.current &&
      activeBlock &&
      page &&
      // Cross-page drops wait for the descendant-page walk, then exclude
      // pages living inside the dragged subtree.
      (!crossPage ||
        (!!forbiddenPagesRef.current &&
          !forbiddenPagesRef.current.has(page.pageID)))
        ? computeDropTarget(
            activeBlock,
            String(over.id),
            pointerRef.current,
            startRelXRef.current,
            indentWidthRef.current,
            rectsRef.current?.get(over.id),
            page,
            foldedRef.current,
          )
        : null;
    // The placement fields stay absolute; the indicator's depth renders in
    // display space (a zoomed page displays its zoom root at depth 1).
    if (target && page?.zoomDepth)
      target = { ...target, depth: target.depth - page.zoomDepth + 1 };
    dropRef.current = target;
    // Only publish when the target actually changes, so pointer movement
    // within the same gap doesn't re-render anything.
    if (!dropTargetEquals(useListDragState.getState().dropTarget, target))
      useListDragState.setState({ dropTarget: target });
  };

  let reset = () => {
    dropRef.current = null;
    activeRef.current = null;
    activePageRef.current = null;
    forbiddenPagesRef.current = null;
    setActive(null);
    markListDragEnd();
    useListDragState.setState({ activeId: null, dropTarget: null });
  };

  let onDragEnd = (_e: DragEndEvent) => {
    let target = dropRef.current;
    let activeBlock = activeRef.current;
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

// Every page reachable from inside `root`'s subtree through page-link (card)
// blocks, transitively — the pages a drop must never target.
async function getDescendantPages(
  rep: Replicache<ReplicacheMutators>,
  root: string,
): Promise<Set<string>> {
  return rep.query(async (tx) => {
    let scan = scanIndex(tx);
    let pages = new Set<string>();
    let queue = [root];
    while (queue.length > 0) {
      let entity = queue.pop()!;
      let children = [
        ...(await scan.eav(entity, "card/block")),
        ...(await scan.eav(entity, "canvas/block")),
      ];
      for (let child of children) queue.push(child.data.value);
      for (let card of await scan.eav(entity, "block/card")) {
        if (!pages.has(card.data.value)) {
          pages.add(card.data.value);
          queue.push(card.data.value);
        }
      }
    }
    return pages;
  });
}

function computeDropTarget(
  activeBlock: Block,
  overId: string,
  pointer: { x: number; y: number },
  startRelX: number,
  indentWidth: number,
  overRect: ClientRect | undefined,
  // The page the pointer is over — not necessarily the page the dragged
  // block came from.
  page: ListDndPage,
  foldedBlocks: readonly string[],
): ListDropTarget | null {
  if (!overRect || !activeBlock.listData) return null;
  let { blocks, pageID } = page;
  // The shallowest depth this view may host: 1, or the zoom root's child
  // depth in a zoomed view (so nothing lands outside the zoomed subtree).
  let floor = page.zoomDepth ? page.zoomDepth + 1 : 1;
  let activeId = activeBlock.entityID;
  let overIndex = blocks.findIndex((b) => b.entityID === overId);
  if (overIndex === -1) return null;
  // When dragging into a different page, the dragged subtree isn't in this
  // page's block list at all, so there is no own slot and nothing to lift out.
  let activeIndex = blocks.findIndex((b) => b.entityID === activeId);
  let samePage = activeIndex !== -1;

  let inActiveSubtree = (b: Block | undefined) =>
    !!b &&
    (b.entityID === activeId ||
      !!b.listData?.path.some((p) => p.entity === activeId));

  let above: Block | undefined;
  let below: Block | undefined;
  let edge: "top" | "bottom" = "top";
  let ownSlot = false;
  if (samePage) {
    // Treat the page as if the dragged subtree were lifted out: the gaps on
    // either side of it collapse into its own slot, whose neighbors are the
    // blocks just outside the subtree. That makes the item's starting
    // position a valid target, so a purely horizontal drag projects an
    // indent/outdent.
    let subtreeEnd = activeIndex;
    while (
      subtreeEnd + 1 < blocks.length &&
      inActiveSubtree(blocks[subtreeEnd + 1])
    )
      subtreeEnd++;
    let slotAbove = blocks[activeIndex - 1];
    let slotBelow = blocks[subtreeEnd + 1];

    if (inActiveSubtree(blocks[overIndex])) {
      above = slotAbove;
      below = slotBelow;
    } else {
      edge = pointer.y < overRect.top + overRect.height / 2 ? "top" : "bottom";
      above = edge === "top" ? blocks[overIndex - 1] : blocks[overIndex];
      below = edge === "top" ? blocks[overIndex] : blocks[overIndex + 1];
      if (inActiveSubtree(above)) above = slotAbove;
      if (inActiveSubtree(below)) below = slotBelow;
    }
    ownSlot =
      (above?.entityID ?? null) === (slotAbove?.entityID ?? null) &&
      (below?.entityID ?? null) === (slotBelow?.entityID ?? null);
  } else {
    edge = pointer.y < overRect.top + overRect.height / 2 ? "top" : "bottom";
    above = edge === "top" ? blocks[overIndex - 1] : blocks[overIndex];
    below = edge === "top" ? blocks[overIndex] : blocks[overIndex + 1];
  }
  let indicator = ownSlot
    ? { entityID: activeId, edge: "top" as const }
    : { entityID: overId, edge };

  // Horizontal travel projects the preferred depth (one indent unit per
  // level), clamped to what the gap allows: from one level above the item
  // below the line (a list split) down to one level under the item above it.
  // Travel is measured against the hovered row's left edge relative to where
  // on its own row the drag started, so it carries across side-by-side pages.
  // The baseline (the item's own depth) is clamped into range first, so a
  // deep item over a shallow gap adjusts from the gap's range instead of
  // needing to claw back the clamped-away distance.
  let minDepth = below?.listData
    ? Math.max(floor, below.listData.depth - 1)
    : floor;
  let maxDepth = above?.listData
    ? above.listData.depth + 1
    : above
      ? 1
      : minDepth;
  let offsetX = pointer.x - overRect.left - startRelX;
  let neutralDepth = Math.min(
    maxDepth,
    Math.max(minDepth, activeBlock.listData.depth),
  );
  let depth = Math.min(
    maxDepth,
    Math.max(minDepth, neutralDepth + Math.round(offsetX / indentWidth)),
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
      position: anchor ? { type: "after", entity: anchor } : { type: "first" },
      unfold:
        landsInHiddenContent && foldedBlocks.includes(above.entityID)
          ? above.entityID
          : undefined,
    };
  }
  // No block above the gap: the top of an unzoomed page, where the item
  // becomes the first root block. In a zoomed view the gap above the zoom
  // root is not a valid target.
  if (floor > 1) return null;
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
