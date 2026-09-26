import { useMemo } from "react";
import { useEntity } from "src/replicache";
import { canvasContentHeight } from "src/utils/canvasBlockOrder";
import { CONTENT_WIDTH } from "src/canvasZoom/math";
import type { CanvasBounds } from "src/utils/embeddedCanvasSize";

// A drawing's canvas is its set size; any other canvas is the full canvas
// width and as tall as its blocks reach.
export function useCanvasSize(pageID: string | null): CanvasBounds {
  let blocks = useEntity(pageID, "canvas/block");
  let fixedWidth = useEntity(pageID, "canvas/fixed-width")?.data.value;
  let fixedHeight = useEntity(pageID, "canvas/fixed-height")?.data.value;
  let fixed = !!fixedWidth && !!fixedHeight;
  let width = (fixed && fixedWidth) || CONTENT_WIDTH;
  let height =
    (fixed && fixedHeight) ||
    canvasContentHeight(blocks.map((b) => b.data.position));
  return useMemo(() => ({ width, height, fixed }), [width, height, fixed]);
}
