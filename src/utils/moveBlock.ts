import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { getSortedSelection } from "components/SelectionManager/selectionState";
import { getBlocksWithType } from "src/replicache/getBlocks";
import { useUIState } from "src/useUIState";

type BlockData = NonNullable<
  Awaited<ReturnType<typeof getBlocksWithType>>
>[number];

// A block's real parent for ordering: its list container, or the page for root
// blocks (getBlocksWithType reports `parent` as the page for every block).
let realParent = (b: BlockData) => b.listData?.parent ?? b.parent;

// Index of the last block in the folded section that begins at `headingIndex`
// (the heading itself plus every following block whose headingPath includes it).
let sectionEnd = (siblings: BlockData[], headingIndex: number) => {
  let heading = siblings[headingIndex].value;
  let end = headingIndex;
  while (
    end + 1 < siblings.length &&
    siblings[end + 1].headingPath?.includes(heading)
  )
    end++;
  return end;
};

// Move the contiguous run siblings[first..last] up or down by one visible slot
// among `siblings`, hopping over any adjacent folded heading section so the run
// never lands inside hidden content. `siblings` must be the ordered direct
// children of `parent`.
let relocateRun = (
  rep: Replicache<ReplicacheMutators>,
  parent: string,
  siblings: BlockData[],
  first: number,
  last: number,
  direction: "up" | "down",
  folded: string[],
) => {
  let run = siblings.slice(first, last + 1).map((b) => b.value);
  let anchor: string | null;
  if (direction === "up") {
    if (first === 0) return; // already at the top
    let prev = siblings[first - 1];
    // If the block above sits inside a folded section, hop to that section's
    // heading so we land above it rather than within its hidden content.
    let foldedAncestor = prev.headingPath?.find((h) => folded.includes(h));
    let targetIndex = foldedAncestor
      ? siblings.findIndex((b) => b.value === foldedAncestor)
      : first - 1;
    anchor = siblings[targetIndex - 1]?.value ?? null;
  } else {
    if (last === siblings.length - 1) return; // already at the bottom
    let next = siblings[last + 1];
    // If the next unit is itself a folded heading, hop past its whole section.
    let targetIndex =
      next.type === "heading" && folded.includes(next.value)
        ? sectionEnd(siblings, last + 1)
        : last + 1;
    anchor = siblings[targetIndex].value;
  }
  rep.mutate.moveBlocks({ parent, blocks: run, after: anchor });
};

// Direct children of `parent` in document order. `parent` is the page for root
// blocks or a list item for nested ones.
let childrenOf = (allBlocks: BlockData[], page: string, parent: string) =>
  parent === page
    ? allBlocks.filter((b) => !b.listData || b.listData.depth === 1)
    : allBlocks.filter((b) => b.listData?.parent === parent);

// When a folded heading is moved, relocate its entire collapsed section (the
// heading plus every root block in its range) as one unit. Returns true when it
// handled the move.
const moveFoldedHeadingSection = async (
  rep: Replicache<ReplicacheMutators>,
  block: BlockData,
  direction: "up" | "down",
): Promise<boolean> => {
  let folded = useUIState.getState().foldedBlocks;
  if (block.type !== "heading" || !folded.includes(block.value)) return false;

  let allBlocks =
    (await rep.query((tx) => getBlocksWithType(tx, block.parent))) || [];
  let rootBlocks = childrenOf(allBlocks, block.parent, block.parent);
  let start = rootBlocks.findIndex((b) => b.value === block.value);
  if (start === -1) return false;
  let end = sectionEnd(rootBlocks, start);
  relocateRun(rep, block.parent, rootBlocks, start, end, direction, folded);
  return true;
};

// Move a multi-block selection up/down as a unit. Only contiguous selections
// that share one parent are supported (the shape the selection UI produces);
// anything else is left for the caller's single-block paths.
const moveMultipleBlocks = async (
  rep: Replicache<ReplicacheMutators>,
  sortedBlocks: BlockData[],
  direction: "up" | "down",
): Promise<boolean> => {
  let folded = useUIState.getState().foldedBlocks;
  let page = sortedBlocks[0].parent;
  let parent = realParent(sortedBlocks[0]);
  if (!sortedBlocks.every((b) => realParent(b) === parent)) return false;

  let allBlocks = (await rep.query((tx) => getBlocksWithType(tx, page))) || [];
  let siblings = childrenOf(allBlocks, page, parent);
  let selected = new Set(sortedBlocks.map((b) => b.value));
  let indices = siblings
    .map((b, i) => (selected.has(b.value) ? i : -1))
    .filter((i) => i >= 0);
  if (indices.length === 0) return false;
  let first = indices[0];
  let last = indices[indices.length - 1];

  // A selected folded heading carries its hidden section along with it.
  for (let i = first; i <= last; i++) {
    let b = siblings[i];
    if (b.type === "heading" && folded.includes(b.value))
      last = Math.max(last, sectionEnd(siblings, i));
  }
  relocateRun(rep, parent, siblings, first, last, direction, folded);
  return true;
};

export const moveBlockUp = async (rep: Replicache<ReplicacheMutators>) => {
  let [sortedBlocks, siblings] = await getSortedSelection(rep);
  if (sortedBlocks.length > 1) {
    await moveMultipleBlocks(rep, sortedBlocks, "up");
    return;
  }
  let block = sortedBlocks[0];
  if (block && (await moveFoldedHeadingSection(rep, block, "up"))) return;
  let previousBlock =
    siblings?.[siblings.findIndex((s) => s.value === block.value) - 1];
  if (previousBlock.value === block.listData?.parent) {
    previousBlock =
      siblings?.[siblings.findIndex((s) => s.value === block.value) - 2];
  }

  if (
    previousBlock?.listData &&
    block.listData &&
    block.listData.depth > 1 &&
    !previousBlock.listData.path.find(
      (f) => f.entity === block.listData?.parent,
    )
  ) {
    let depth = block.listData.depth;
    let newParent = previousBlock.listData.path.find(
      (f) => f.depth === depth - 1,
    );
    if (!newParent) return;
    if (useUIState.getState().foldedBlocks.includes(newParent.entity))
      useUIState.getState().toggleFold(newParent.entity);
    rep?.mutate.moveBlock({
      block: block.value,
      oldParent: block.listData?.parent,
      newParent: newParent.entity,
      position: { type: "end" },
    });
  } else {
    rep?.mutate.moveBlockUp({
      entityID: block.value,
      parent: block.listData?.parent || block.parent,
    });
  }
};

export const moveBlockDown = async (
  rep: Replicache<ReplicacheMutators>,
  permission_set: string,
) => {
  let [sortedBlocks, siblings] = await getSortedSelection(rep);
  if (sortedBlocks.length > 1) {
    await moveMultipleBlocks(rep, sortedBlocks, "down");
    return;
  }
  let block = sortedBlocks[0];
  if (block && (await moveFoldedHeadingSection(rep, block, "down"))) return;
  let nextBlock = siblings
    .slice(siblings.findIndex((s) => s.value === block.value) + 1)
    .find(
      (f) =>
        f.listData &&
        block.listData &&
        !f.listData.path.find((f) => f.entity === block.value),
    );
  if (
    nextBlock?.listData &&
    block.listData &&
    nextBlock.listData.depth === block.listData.depth - 1
  ) {
    if (useUIState.getState().foldedBlocks.includes(nextBlock.value))
      useUIState.getState().toggleFold(nextBlock.value);
    rep?.mutate.moveBlock({
      block: block.value,
      oldParent: block.listData?.parent,
      newParent: nextBlock.value,
      position: { type: "first" },
    });
  } else {
    // Moving down past a folded heading lands the block inside its hidden
    // section; unfold it so the moved block stays visible.
    let visibleNext =
      siblings[siblings.findIndex((s) => s.value === block.value) + 1];
    if (
      visibleNext?.type === "heading" &&
      useUIState.getState().foldedBlocks.includes(visibleNext.value)
    )
      useUIState.getState().toggleFold(visibleNext.value);
    rep?.mutate.moveBlockDown({
      entityID: block.value,
      parent: block.listData?.parent || block.parent,
      permission_set: permission_set,
    });
  }
};
