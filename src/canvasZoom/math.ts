export const CONTENT_WIDTH = 1272;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;
export const MAX_ZOOM = 2;
// Mirrored by the .canvasZoomLayer min-height rule in globals.css.
const MIN_ZOOM_FLOOR = 0.25;

const WHEEL_UNIT_CLAMP = 10;
// Time constant of the per-frame approach toward a wheel/button/keyboard
// target: 95% of the way in ~3x this.
const ZOOM_SMOOTHING_MS = 60;
// Ratio to the target below which the zoom snaps onto it.
const ZOOM_SNAP_RATIO = 1e-3;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;

export type Point = { x: number; y: number };

// A zero-width box (not laid out yet) gets the floor.
export function minZoom(clientWidth: number, contentWidth: number) {
  return Math.min(MIN_ZOOM_FLOOR, clientWidth / contentWidth || 1);
}

// The zoom a canvas opens at, as the stylesheet computes it.
export function fitZoom(clientWidth: number, width: number) {
  return Math.min(1, clientWidth / width || 1);
}

// Sideways offset that centers a canvas area in the box, which equals the
// area's left edge once the zoom fits the area to the box. Mirrored by the
// .canvasZoomLocked rule in globals.css.
export function scrollToCenterArea(
  area: { left: number; width: number },
  zoom: number,
  clientWidth: number,
) {
  return Math.max(0, (area.left + area.width / 2) * zoom - clientWidth / 2);
}

export function clampZoom(z: number, min: number) {
  if (!Number.isFinite(z)) return min;
  return Math.min(MAX_ZOOM, Math.max(min, z));
}

// Converts one wheel event into a multiplicative zoom factor. The caller must
// read `deltaY` off the event before `deltaMode`: Firefox reports line deltas
// (DOM_DELTA_LINE) for mouse wheels, but if a listener touches the delta values
// first it converts them to pixels and flips deltaMode to DOM_DELTA_PIXEL, so
// reading in the other order can pair a pixel value with a line mode and
// over-scale it 16x.
export function wheelToZoomFactor(deltaY: number, deltaMode: number) {
  let px = deltaY;
  if (deltaMode === 1) px = deltaY * LINE_HEIGHT_PX;
  else if (deltaMode === 2) px = deltaY * PAGE_HEIGHT_PX;
  if (!Number.isFinite(px)) return 1;
  let clamped = Math.max(-WHEEL_UNIT_CLAMP, Math.min(WHEEL_UNIT_CLAMP, px));
  return Math.exp(-clamped / 100);
}

// tldraw's midpoint rule: stepping in lands on the first step whose lower
// neighbour is closer than half a step away, so a zoom just past a step still
// reaches the next one instead of snapping back onto the step it left.
export function nextStep(z: number, dir: 1 | -1) {
  if (dir === 1) {
    for (let i = 1; i < ZOOM_STEPS.length; i++) {
      let z1 = ZOOM_STEPS[i - 1];
      let z2 = ZOOM_STEPS[i];
      if (z2 - z1 > (z - z1) * 2) return z2;
    }
    return ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  for (let i = ZOOM_STEPS.length - 1; i > 0; i--) {
    let z1 = ZOOM_STEPS[i - 1];
    let z2 = ZOOM_STEPS[i];
    if (z2 - z1 > (z2 - z) * 2) return z1;
  }
  return ZOOM_STEPS[0];
}

// `anchorViewport` is measured from the scroller's client box (clientX minus
// the scroller rect), `anchorCanvas` is the unscaled canvas point that should
// stay under it.
export function scrollForAnchor(args: {
  anchorViewport: Point;
  anchorCanvas: Point;
  zoom: number;
}) {
  return {
    scrollLeft: args.anchorCanvas.x * args.zoom - args.anchorViewport.x,
    scrollTop: args.anchorCanvas.y * args.zoom - args.anchorViewport.y,
  };
}

export function anchorToCanvas(args: {
  anchorViewport: Point;
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
}): Point {
  return {
    x: (args.scrollLeft + args.anchorViewport.x) / args.zoom,
    y: (args.scrollTop + args.anchorViewport.y) / args.zoom,
  };
}

export type Scroll = { left: number; top: number };
type Size = { width: number; height: number };
export type Pads = { top: number; right: number; bottom: number; left: number };

export const NO_PADS: Pads = { top: 0, right: 0, bottom: 0, left: 0 };

// A scroller's extent (scrollWidth/scrollHeight) and viewport size.
export type ScrollRange = Size & { scrollWidth: number; scrollHeight: number };

// Spacer padding that makes an offset the anchor asks for (negative, or
// past the scroller's end, when the anchor sits near an edge) a valid
// scroll position: exactly the space it needs beyond the scroller's extent
// with the spacer unpadded, none once the content covers the viewport
// again. Any scrollable space the scroller already has around the spacer
// (a header above it) is part of that extent, so it is never padded for.
export function padsForScroll(scroll: Scroll, range: ScrollRange): Pads {
  return {
    left: Math.max(0, -scroll.left),
    top: Math.max(0, -scroll.top),
    right: Math.max(0, scroll.left + range.width - range.scrollWidth),
    bottom: Math.max(0, scroll.top + range.height - range.scrollHeight),
  };
}

// Pads a native scroll has moved fully off screen, dropped: the left/top pad
// once the offset is past it (which shifts the offset by the pad so nothing
// moves on screen), the right/bottom pad once the content's end is back in
// view. `origin` is where the spacer starts in the scroller's extent and
// `range` the extent with the pads still in place. Null when every pad is
// still in use.
export function trimPads(
  pads: Pads,
  scroll: Scroll,
  origin: Scroll,
  range: ScrollRange,
): { pads: Pads; shift: Scroll } | null {
  let next = { ...pads };
  let shift = { left: 0, top: 0 };
  if (pads.left && scroll.left >= origin.left + pads.left) {
    next.left = 0;
    shift.left = pads.left;
  }
  if (pads.top && scroll.top >= origin.top + pads.top) {
    next.top = 0;
    shift.top = pads.top;
  }
  if (pads.right && scroll.left + range.width <= range.scrollWidth - pads.right)
    next.right = 0;
  if (
    pads.bottom &&
    scroll.top + range.height <= range.scrollHeight - pads.bottom
  )
    next.bottom = 0;
  if (
    next.left === pads.left &&
    next.top === pads.top &&
    next.right === pads.right &&
    next.bottom === pads.bottom
  )
    return null;
  return { pads: next, shift };
}

// One frame of exponential smoothing in log space (so a 2x step looks the
// same going in and out), returning the target once within the snap ratio.
// Wheel events arrive on their own jittery cadence, so applying each one
// directly moves the zoom on some frames and not others.
export function approachZoom(current: number, target: number, dtMs: number) {
  if (!(dtMs > 0)) return current;
  let gap = Math.log(target / current);
  if (Math.abs(gap) < ZOOM_SNAP_RATIO) return target;
  return current * Math.exp(gap * (1 - Math.exp(-dtMs / ZOOM_SMOOTHING_MS)));
}
