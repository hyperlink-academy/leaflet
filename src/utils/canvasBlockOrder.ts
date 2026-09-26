type Position = { x: number; y: number };

// Canvas blocks carry no document order; every surface that needs a reading
// order (titles, lightbox paging, email thumbnails) sorts with this so they
// agree. Takes anything positioned: record blocks and editor positions alike.
export function canvasBlockOrder(a: Position, b: Position) {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

// The content div has size containment, so its laid-out height is exactly
// this min-height; the zoom spacer is sized from the same number.
export function canvasContentHeight(blocks: { y: number }[]) {
  return Math.max(...blocks.map((b) => b.y), 0) + 512;
}

export type CanvasLayer = Position & { stackOrder?: string | null };

// Paint order, lowest first. Every block placed on a canvas gets a stackOrder;
// the ones without are from before layering existed, so they keep the position
// order that used to be the whole stacking rule and sit below everything
// carrying an explicit index.
export function canvasStackingOrder(a: CanvasLayer, b: CanvasLayer) {
  let aOrder = a.stackOrder ?? null;
  let bOrder = b.stackOrder ?? null;
  if (aOrder === null || bOrder === null) {
    if (aOrder === bOrder) return canvasBlockOrder(a, b);
    return aOrder === null ? -1 : 1;
  }
  return aOrder === bOrder ? canvasBlockOrder(a, b) : aOrder < bOrder ? -1 : 1;
}

// Resolves each block's fractional stackOrder to the dense integer the DOM
// wants, in the order `blocks` was given in — so callers can keep rendering in
// reading order (which is what block indexes in quote and comment anchors are
// counted against) and still stack correctly.
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
