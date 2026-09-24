export type CanvasSize = { width: number; height: number };

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

// How much of a block must stay inside a fixed canvas, so a drag can't lose
// it past an edge where nothing can reach it.
const MIN_VISIBLE = 24;

export function clampToCanvasSize(
  position: { x: number; y: number },
  block: { width: number; height: number },
  size: CanvasSize,
) {
  let clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), Math.max(min, max));
  return {
    x: clamp(position.x, MIN_VISIBLE - block.width, size.width - MIN_VISIBLE),
    y: clamp(position.y, MIN_VISIBLE - block.height, size.height - MIN_VISIBLE),
  };
}
