type Position = { x: number; y: number };

// Canvas blocks carry no document order; every surface that needs a reading
// order (titles, lightbox paging, email thumbnails) sorts with this so they agree.
export function canvasBlockOrder(a: Position, b: Position) {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

// The content div has size containment, so its laid-out height is exactly
// this min-height; the zoom spacer is sized from the same number.
export function canvasContentHeight(blocks: { y: number }[]) {
  return Math.max(...blocks.map((b) => b.y), 0) + 512;
}

export type CanvasLayer = Position & { stackOrder?: string | null };

// Paint order, lowest first. Blocks without a stackOrder predate layering:
// position order, below every layered block.
export function canvasStackingOrder(a: CanvasLayer, b: CanvasLayer) {
  if (a.stackOrder == b.stackOrder) return canvasBlockOrder(a, b);
  if (a.stackOrder == null) return -1;
  if (b.stackOrder == null) return 1;
  return a.stackOrder < b.stackOrder ? -1 : 1;
}

// Each block's dense stack order, in the order given, so callers can render in
// reading order (which quote and comment anchor indexes count against).
export function canvasStackOrders(blocks: CanvasLayer[]): number[] {
  let stackOrders = new Array<number>(blocks.length);
  blocks
    .map((_, i) => i)
    .sort((a, b) => canvasStackingOrder(blocks[a], blocks[b]))
    .forEach((block, stackOrder) => {
      stackOrders[block] = stackOrder + 1;
    });
  return stackOrders;
}

// Above any block's stack order, for the block being dragged.
export const CANVAS_DRAG_STACK_ORDER = 10000;
