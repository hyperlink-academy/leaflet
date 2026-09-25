export const CONTENT_WIDTH = 1272;
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;
export const MAX_ZOOM = 2;
// Mirrored by the .canvasZoomLayer min-height rule in globals.css.
export const MIN_ZOOM_FLOOR = 0.25;

const WHEEL_UNIT_CLAMP = 10;
// Time constant of the per-frame approach toward a wheel/button/keyboard
// target: 95% of the way in ~3x this.
export const ZOOM_SMOOTHING_MS = 60;
// Ratio to the target below which the zoom snaps onto it.
const ZOOM_SNAP_RATIO = 1e-3;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;

export type Point = { x: number; y: number };

export function fitToWidth(clientWidth: number, contentWidth = CONTENT_WIDTH) {
  if (clientWidth <= 0 || contentWidth <= 0) return 1;
  return clientWidth / contentWidth;
}

export function minZoom(clientWidth: number, contentWidth = CONTENT_WIDTH) {
  return Math.min(MIN_ZOOM_FLOOR, fitToWidth(clientWidth, contentWidth));
}

export function clampZoom(z: number, min: number, max = MAX_ZOOM) {
  if (!Number.isFinite(z)) return min;
  return Math.min(max, Math.max(min, z));
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
export function nextStep(
  z: number,
  dir: 1 | -1,
  steps: readonly number[] = ZOOM_STEPS,
) {
  if (dir === 1) {
    for (let i = 1; i < steps.length; i++) {
      let z1 = steps[i - 1];
      let z2 = steps[i];
      if (z2 - z1 > (z - z1) * 2) return z2;
    }
    return steps[steps.length - 1];
  }
  for (let i = steps.length - 1; i > 0; i--) {
    let z1 = steps[i - 1];
    let z2 = steps[i];
    if (z2 - z1 > (z2 - z) * 2) return z1;
  }
  return steps[0];
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

export function anchoredScroll(args: {
  anchorViewportX: number;
  anchorViewportY: number;
  scrollLeft: number;
  scrollTop: number;
  zOld: number;
  zNew: number;
}) {
  let anchorViewport = { x: args.anchorViewportX, y: args.anchorViewportY };
  let anchorCanvas = anchorToCanvas({
    anchorViewport,
    scrollLeft: args.scrollLeft,
    scrollTop: args.scrollTop,
    zoom: args.zOld,
  });
  return scrollForAnchor({ anchorViewport, anchorCanvas, zoom: args.zNew });
}

export type Scroll = { left: number; top: number };
export type Size = { width: number; height: number };
export type Pads = { top: number; right: number; bottom: number; left: number };

export const NO_PADS: Pads = { top: 0, right: 0, bottom: 0, left: 0 };

// The spacer's content box: the zoomed canvas and its margins, never
// smaller than the viewport (the stylesheet's min-width/min-height: 100%).
export function contentBox(args: {
  zoom: number;
  contentWidth: number;
  contentHeight: number;
  clientWidth: number;
  clientHeight: number;
  margin?: Scroll;
}): Size {
  let margin = args.margin ?? { left: 0, top: 0 };
  return {
    width: Math.max(
      args.contentWidth * args.zoom + 2 * margin.left,
      args.clientWidth,
    ),
    height: Math.max(
      args.contentHeight * args.zoom + 2 * margin.top,
      args.clientHeight,
    ),
  };
}

// Scrollable space a host scroller already has beyond the spacer on each
// vertical side (a page header above the canvas, page padding below it).
export type Slack = { top: number; bottom: number };

export const NO_SLACK: Slack = { top: 0, bottom: 0 };

// Spacer padding that makes a pad-free offset (content at the scroller's
// origin; negative or past the content when the anchor sits near an edge)
// a valid scroll position: exactly the empty space it leaves on each side
// that the scroller does not already have, none once the content covers
// the viewport again.
export function padsForScroll(
  scroll: Scroll,
  client: Size,
  box: Size,
  slack: Slack = NO_SLACK,
): Pads {
  return {
    left: Math.max(0, -scroll.left),
    top: Math.max(0, -scroll.top - slack.top),
    right: Math.max(0, scroll.left + client.width - box.width),
    bottom: Math.max(0, scroll.top + client.height - box.height - slack.bottom),
  };
}

// A canvas whose vertical scrolling belongs to the page scroller around it:
// its spacer starts `origin` px into that scroller's content, and its
// viewport `viewportTop` px into that scroller's client box (below whatever
// is stuck there). The canvas's own offset is negative while the page is
// scrolled above the spacer.
export function pageToCanvasScrollTop(
  pageScrollTop: number,
  origin: number,
  viewportTop: number,
) {
  return pageScrollTop + viewportTop - origin;
}

export function canvasToPageScrollTop(
  scrollTop: number,
  origin: number,
  viewportTop: number,
) {
  return scrollTop + origin - viewportTop;
}

// Pads a native scroll has moved fully off screen, dropped: the left/top pad
// once the offset is past it (which shifts the offset by the pad so nothing
// moves on screen), the right/bottom pad once the content's end is back in
// view. Null when every pad is still in use.
export function trimPads(
  pads: Pads,
  scroll: Scroll,
  client: Size,
  box: Size,
): { pads: Pads; shift: Scroll } | null {
  let next = { ...pads };
  let shift = { left: 0, top: 0 };
  if (pads.left && scroll.left >= pads.left) {
    next.left = 0;
    shift.left = pads.left;
  }
  if (pads.top && scroll.top >= pads.top) {
    next.top = 0;
    shift.top = pads.top;
  }
  if (pads.right && scroll.left + client.width <= pads.left + box.width)
    next.right = 0;
  if (pads.bottom && scroll.top + client.height <= pads.top + box.height)
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
export function approachZoom(
  current: number,
  target: number,
  dtMs: number,
  tau = ZOOM_SMOOTHING_MS,
) {
  if (!(dtMs > 0)) return current;
  let gap = Math.log(target / current);
  if (Math.abs(gap) < ZOOM_SNAP_RATIO) return target;
  return current * Math.exp(gap * (1 - Math.exp(-dtMs / tau)));
}

// Empty space the spacer keeps around the content on each side, besides
// the engine's padding (--canvas-margin-x/y in globals.css). A centered
// canvas keeps half a viewport, so any point of it can be scrolled to the
// viewport's center at any zoom.
export function contentMargin(centered: boolean, client: Size): Scroll {
  if (!centered) return { left: 0, top: 0 };
  return { left: client.width / 2, top: client.height / 2 };
}
