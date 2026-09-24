export type CanvasSize = { width: number; height: number };
// A canvas page's size; `fixed` for a drawing, whose blocks are clipped to it.
export type CanvasBounds = CanvasSize & { fixed: boolean };

// The default page width, so a drawing's text reads at body size inline.
export const EMBEDDED_CANVAS_WIDTH = 624;

export const EMBEDDED_CANVAS_SIZES = {
  short: { width: EMBEDDED_CANVAS_WIDTH, height: 240 },
  medium: { width: EMBEDDED_CANVAS_WIDTH, height: 416 },
  square: { width: EMBEDDED_CANVAS_WIDTH, height: EMBEDDED_CANVAS_WIDTH },
  tall: { width: EMBEDDED_CANVAS_WIDTH, height: 832 },
} as const satisfies Record<string, CanvasSize>;

export type EmbeddedCanvasSizeName = keyof typeof EMBEDDED_CANVAS_SIZES;

export const DEFAULT_EMBEDDED_CANVAS_SIZE: EmbeddedCanvasSizeName = "medium";

export function embeddedCanvasSizeName(
  size: CanvasSize,
): EmbeddedCanvasSizeName | null {
  for (let [name, s] of Object.entries(EMBEDDED_CANVAS_SIZES))
    if (s.width === size.width && s.height === size.height)
      return name as EmbeddedCanvasSizeName;
  return null;
}

// How much of a block must stay inside a drawing, so a drawing's edge can't
// lose it where nothing can reach it. Other canvases grow to fit.
const MIN_VISIBLE = 24;

export function clampToCanvas(
  position: { x: number; y: number },
  block: { width: number; height: number },
  canvas: CanvasBounds,
) {
  if (!canvas.fixed) return position;
  let clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), Math.max(min, max));
  return {
    x: clamp(position.x, MIN_VISIBLE - block.width, canvas.width - MIN_VISIBLE),
    y: clamp(
      position.y,
      MIN_VISIBLE - block.height,
      canvas.height - MIN_VISIBLE,
    ),
  };
}
