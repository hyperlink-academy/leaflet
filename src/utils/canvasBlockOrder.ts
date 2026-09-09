import type { PubLeafletPagesCanvas } from "lexicons/api";

// Canvas blocks carry no document order; every surface that needs a reading
// order (titles, lightbox paging, email thumbnails) sorts with this so they
// agree.
export function canvasBlockOrder(
  a: PubLeafletPagesCanvas.Block,
  b: PubLeafletPagesCanvas.Block,
) {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}
