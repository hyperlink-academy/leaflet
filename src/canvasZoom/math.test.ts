import { describe, expect, it } from "vitest";
import {
  approachZoom,
  MAX_ZOOM,
  ZOOM_STEPS,
  anchoredScroll,
  NO_PADS,
  padsForScroll,
  trimPads,
  clampZoom,
  fitToWidth,
  minZoom,
  nextStep,
  wheelToZoomFactor,
  contentMargin,
} from "./math";

const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

describe("wheelToZoomFactor", () => {
  it("maps pixel deltas through exp(-delta/100)", () => {
    expect(wheelToZoomFactor(5, DOM_DELTA_PIXEL)).toBeCloseTo(Math.exp(-0.05));
    expect(wheelToZoomFactor(-5, DOM_DELTA_PIXEL)).toBeCloseTo(Math.exp(0.05));
    expect(wheelToZoomFactor(0, DOM_DELTA_PIXEL)).toBe(1);
  });

  it("clamps each event to +/-10 units", () => {
    expect(wheelToZoomFactor(400, DOM_DELTA_PIXEL)).toBeCloseTo(Math.exp(-0.1));
    expect(wheelToZoomFactor(-400, DOM_DELTA_PIXEL)).toBeCloseTo(Math.exp(0.1));
    expect(wheelToZoomFactor(10, DOM_DELTA_PIXEL)).toBeCloseTo(
      wheelToZoomFactor(10000, DOM_DELTA_PIXEL),
    );
  });

  it("normalizes line and page delta modes to pixels before clamping", () => {
    expect(wheelToZoomFactor(0.25, DOM_DELTA_LINE)).toBeCloseTo(
      wheelToZoomFactor(4, DOM_DELTA_PIXEL),
    );
    expect(wheelToZoomFactor(3, DOM_DELTA_LINE)).toBeCloseTo(Math.exp(-0.1));
    expect(wheelToZoomFactor(1, DOM_DELTA_PAGE)).toBeCloseTo(Math.exp(-0.1));
    expect(wheelToZoomFactor(-0.005, DOM_DELTA_PAGE)).toBeCloseTo(
      wheelToZoomFactor(-4, DOM_DELTA_PIXEL),
    );
  });

  it("treats a pixel-converted Firefox delta the same as a native pixel delta", () => {
    // Firefox reports deltaMode LINE for mouse wheels but converts to PIXEL
    // when the listener reads deltaY first; both readings must agree.
    let asLine = wheelToZoomFactor(3, DOM_DELTA_LINE);
    let asConvertedPixels = wheelToZoomFactor(48, DOM_DELTA_PIXEL);
    expect(asLine).toBeCloseTo(asConvertedPixels);
  });

  it("ignores non-finite deltas", () => {
    expect(wheelToZoomFactor(NaN, DOM_DELTA_PIXEL)).toBe(1);
  });
});

describe("nextStep", () => {
  it("steps up the ladder from a step", () => {
    expect(nextStep(1, 1)).toBe(1.5);
    expect(nextStep(0.25, 1)).toBe(0.5);
    expect(nextStep(1.5, 1)).toBe(2);
  });

  it("steps down the ladder from a step", () => {
    expect(nextStep(1, -1)).toBe(0.75);
    expect(nextStep(2, -1)).toBe(1.5);
    expect(nextStep(0.5, -1)).toBe(0.25);
  });

  it("stays at the limits", () => {
    expect(nextStep(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextStep(3, 1)).toBe(MAX_ZOOM);
    expect(nextStep(ZOOM_STEPS[0], -1)).toBe(ZOOM_STEPS[0]);
    expect(nextStep(0.1, -1)).toBe(ZOOM_STEPS[0]);
  });

  it("between steps, goes to the next step past the nearer half", () => {
    expect(nextStep(1.1, 1)).toBe(1.5);
    expect(nextStep(1.4, 1)).toBe(2);
    expect(nextStep(1.4, -1)).toBe(1);
    expect(nextStep(1.1, -1)).toBe(0.75);
    expect(nextStep(0.6, 1)).toBe(0.75);
    expect(nextStep(0.6, -1)).toBe(0.25);
    expect(nextStep(0.7, -1)).toBe(0.5);
  });
});

describe("anchoredScroll", () => {
  function check(args: {
    anchorViewportX: number;
    anchorViewportY: number;
    scrollLeft: number;
    scrollTop: number;
    zOld: number;
    zNew: number;
  }) {
    let anchorCanvasX = (args.scrollLeft + args.anchorViewportX) / args.zOld;
    let anchorCanvasY = (args.scrollTop + args.anchorViewportY) / args.zOld;
    let next = anchoredScroll(args);
    expect(next.scrollLeft).toBeCloseTo(
      anchorCanvasX * args.zNew - args.anchorViewportX,
    );
    expect(next.scrollTop).toBeCloseTo(
      anchorCanvasY * args.zNew - args.anchorViewportY,
    );
    // The canvas point under the anchor is unchanged after the zoom.
    expect((next.scrollLeft + args.anchorViewportX) / args.zNew).toBeCloseTo(
      anchorCanvasX,
    );
    expect((next.scrollTop + args.anchorViewportY) / args.zNew).toBeCloseTo(
      anchorCanvasY,
    );
    return next;
  }

  it("keeps the anchor fixed when zooming in", () => {
    let next = check({
      anchorViewportX: 300,
      anchorViewportY: 200,
      scrollLeft: 100,
      scrollTop: 50,
      zOld: 1,
      zNew: 2,
    });
    expect(next).toEqual({ scrollLeft: 500, scrollTop: 300 });
  });

  it("keeps the anchor fixed when zooming out", () => {
    check({
      anchorViewportX: 640,
      anchorViewportY: 360,
      scrollLeft: 800,
      scrollTop: 1200,
      zOld: 1.5,
      zNew: 0.75,
    });
  });

  it("is a no-op at the same zoom", () => {
    expect(
      anchoredScroll({
        anchorViewportX: 10,
        anchorViewportY: 20,
        scrollLeft: 30,
        scrollTop: 40,
        zOld: 1.2,
        zNew: 1.2,
      }),
    ).toEqual({ scrollLeft: 30, scrollTop: 40 });
  });

  it("composes: zooming in then out returns to the start", () => {
    let a = anchoredScroll({
      anchorViewportX: 123,
      anchorViewportY: 456,
      scrollLeft: 210,
      scrollTop: 330,
      zOld: 1,
      zNew: 1.7,
    });
    let b = anchoredScroll({
      anchorViewportX: 123,
      anchorViewportY: 456,
      scrollLeft: a.scrollLeft,
      scrollTop: a.scrollTop,
      zOld: 1.7,
      zNew: 1,
    });
    expect(b.scrollLeft).toBeCloseTo(210);
    expect(b.scrollTop).toBeCloseTo(330);
  });
});

describe("clampZoom", () => {
  it("clamps into [min, max]", () => {
    expect(clampZoom(5, 0.25)).toBe(MAX_ZOOM);
    expect(clampZoom(0.01, 0.25)).toBe(0.25);
    expect(clampZoom(1.3, 0.25)).toBe(1.3);
    expect(clampZoom(NaN, 0.25)).toBe(0.25);
  });

  it("preserves the focal point when the requested zoom is clamped", () => {
    let requested = 4;
    let clamped = clampZoom(requested, 0.25);
    let anchorViewportX = 200;
    let anchorViewportY = 100;
    let scrollLeft = 400;
    let scrollTop = 300;
    let next = anchoredScroll({
      anchorViewportX,
      anchorViewportY,
      scrollLeft,
      scrollTop,
      zOld: 1,
      zNew: clamped,
    });
    expect((next.scrollLeft + anchorViewportX) / clamped).toBeCloseTo(
      scrollLeft + anchorViewportX,
    );
    expect((next.scrollTop + anchorViewportY) / clamped).toBeCloseTo(
      scrollTop + anchorViewportY,
    );
  });
});

describe("fitToWidth / minZoom", () => {
  it("divides the scroller width by the content width", () => {
    expect(fitToWidth(1272)).toBe(1);
    expect(fitToWidth(636)).toBe(0.5);
    expect(fitToWidth(390)).toBeCloseTo(390 / 1272);
    expect(fitToWidth(500, 1000)).toBe(0.5);
  });

  it("falls back to 1 for a zero-width scroller", () => {
    expect(fitToWidth(0)).toBe(1);
  });

  it("min zoom is the smaller of the floor and fit-to-width", () => {
    expect(minZoom(1272)).toBe(0.25);
    expect(minZoom(200)).toBeCloseTo(200 / 1272);
  });
});

describe("padsForScroll / trimPads", () => {
  // A 1272x3000 canvas at half zoom in a 1000x800 scroller: the spacer is
  // as wide as the viewport and 1500 tall.
  let range = {
    width: 1000,
    height: 800,
    scrollWidth: 1000,
    scrollHeight: 1500,
  };
  let origin = { left: 0, top: 0 };

  it("an in-range offset needs no padding", () => {
    expect(padsForScroll({ left: 0, top: 300 }, range)).toEqual(NO_PADS);
  });

  it("a negative offset becomes left/top padding", () => {
    expect(padsForScroll({ left: -77, top: -51 }, range)).toEqual({
      ...NO_PADS,
      left: 77,
      top: 51,
    });
  });

  it("an offset past the scroller's end becomes right/bottom padding", () => {
    expect(padsForScroll({ left: 200, top: 1000 }, range)).toEqual({
      ...NO_PADS,
      right: 200,
      bottom: 300,
    });
  });

  it("never pads for space the scroller already has around the spacer", () => {
    // A 240px header above the spacer and 24px of page padding below it.
    let page = { ...range, scrollHeight: 240 + 1500 + 24 };
    expect(padsForScroll({ left: 0, top: 40 }, page)).toEqual(NO_PADS);
    expect(padsForScroll({ left: 0, top: -60 }, page)).toEqual({
      ...NO_PADS,
      top: 60,
    });
    expect(padsForScroll({ left: 0, top: 964 }, page)).toEqual(NO_PADS);
    expect(padsForScroll({ left: 0, top: 1000 }, page)).toEqual({
      ...NO_PADS,
      bottom: 36,
    });
  });

  it("drops a left/top pad scrolled off screen and shifts the offset by it", () => {
    let pads = { ...NO_PADS, left: 77, top: 51 };
    let padded = { ...range, scrollWidth: 1077, scrollHeight: 1551 };
    expect(trimPads(pads, { left: 80, top: 60 }, origin, padded)).toEqual({
      pads: NO_PADS,
      shift: { left: 77, top: 51 },
    });
    // The pad counts from where the spacer starts in the scroller.
    let below = { left: 0, top: 240 };
    let page = { ...padded, scrollHeight: 240 + 1551 };
    expect(trimPads(pads, { left: 80, top: 260 }, below, page)).toEqual({
      pads: { ...NO_PADS, top: 51 },
      shift: { left: 77, top: 0 },
    });
    expect(trimPads(pads, { left: 80, top: 300 }, below, page)).toEqual({
      pads: NO_PADS,
      shift: { left: 77, top: 51 },
    });
  });

  it("drops a right/bottom pad once the content end is back in view", () => {
    let pads = { ...NO_PADS, right: 200, bottom: 300 };
    let padded = { ...range, scrollWidth: 1200, scrollHeight: 1800 };
    expect(trimPads(pads, { left: 0, top: 0 }, origin, padded)).toEqual({
      pads: NO_PADS,
      shift: { left: 0, top: 0 },
    });
  });

  it("keeps a pad that is still partly on screen", () => {
    let pads = { ...NO_PADS, left: 77, top: 51 };
    let padded = { ...range, scrollWidth: 1077, scrollHeight: 1551 };
    expect(trimPads(pads, { left: 40, top: 20 }, origin, padded)).toBeNull();
    let trailing = { ...NO_PADS, right: 200, bottom: 300 };
    let trailingRange = { ...range, scrollWidth: 1200, scrollHeight: 1800 };
    expect(
      trimPads(trailing, { left: 150, top: 900 }, origin, trailingRange),
    ).toBeNull();
  });
});

describe("approachZoom", () => {
  it("moves a fixed fraction of the remaining log gap per frame", () => {
    let z = approachZoom(1, 2, 60);
    expect(Math.log(z)).toBeCloseTo(Math.log(2) * (1 - Math.exp(-1)), 6);
  });
  it("is symmetric in and out", () => {
    let up = approachZoom(1, 2, 16);
    let down = approachZoom(1, 0.5, 16);
    expect(up * down).toBeCloseTo(1, 9);
  });
  it("snaps onto the target when close and holds there", () => {
    let z = 1;
    for (let i = 0; i < 60; i++) z = approachZoom(z, 1.5, 16);
    expect(z).toBe(1.5);
    expect(approachZoom(1.5, 1.5, 16)).toBe(1.5);
  });
  it("does not move without elapsed time", () => {
    expect(approachZoom(1, 2, 0)).toBe(1);
  });
});

describe("centered canvases", () => {
  let client = { width: 800, height: 600 };

  it("surround the content with half a viewport", () => {
    expect(contentMargin(true, client)).toEqual({ left: 400, top: 300 });
  });

  it("keep no margin on other canvases", () => {
    expect(contentMargin(false, client)).toEqual({ left: 0, top: 0 });
  });
});
