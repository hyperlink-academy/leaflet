import { useEffect } from "react";
import type { CanvasZoomEngine } from "./CanvasZoomProvider";
import { MAX_ZOOM, type Point, nextStep, wheelToZoomFactor } from "./math";
import { setCanvasPinching } from "./session";
import { isIOS } from "src/utils/isDevice";

// Finger-distance change before two fingers count as a zoom rather than a
// pan. Kept small so a pinch responds at once; the distance is rebased when
// zooming starts, so crossing the line never applies the dead zone as a jump.
const PINCH_ZOOM_THRESHOLD = 8;
const PINCH_PAN_THRESHOLD = 16;
const PINCH_PAN_TO_ZOOM_THRESHOLD = 48;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;
const TAP_MOVE_SLOP = 10;

// Content a double tap is meant for rather than the canvas behind it.
const INTERACTIVE =
  "a, button, input, textarea, select, video, audio, [contenteditable], [role='button'], .ProseMirror";

type SafariGestureEvent = Event & {
  scale: number;
  clientX: number;
  clientY: number;
};

type Pinch = {
  state: "unsure" | "panning" | "zooming";
  startDist: number;
  startMid: Point;
  startZoom: number;
  anchorCanvas: Point;
};

function touchPoints(touches: TouchList) {
  let a = touches[0];
  let b = touches[1];
  return {
    dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
    mid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
  };
}

/**
 * Wheel, trackpad, pinch and keyboard zoom, plus double tap when `doubleTap`.
 * Double tap (touch only) zooms in around the tap: to 1 when below it,
 * otherwise to the next step, and from MAX_ZOOM back to the minimum. It is
 * detected from pointer events, since iOS fires no dblclick for taps.
 */
export function useCanvasZoomGestures(
  engine: CanvasZoomEngine,
  enabled: boolean,
  doubleTap: boolean,
) {
  useEffect(() => {
    let scroller = engine.boxRef.current;
    if (!scroller || !enabled) return;
    let abort = new AbortController();
    let signal = abort.signal;

    let hovered = false;
    let safariGestureActive = false;
    let safariGestureStartZoom = 1;
    let pinch: Pinch | null = null;
    let down: { id: number; x: number; y: number; t: number } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;

    scroller.addEventListener(
      "wheel",
      (e) => {
        if (safariGestureActive) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        // deltaY must be read before deltaMode; see wheelToZoomFactor.
        let factor = wheelToZoomFactor(e.deltaY, e.deltaMode);
        engine.zoomAtClient(engine.targetZoom() * factor, e.clientX, e.clientY);
      },
      { passive: false, signal },
    );

    if ("GestureEvent" in window && !isIOS()) {
      scroller.addEventListener(
        "gesturestart",
        (e) => {
          e.preventDefault();
          safariGestureActive = true;
          safariGestureStartZoom = engine.targetZoom();
        },
        { passive: false, signal },
      );
      scroller.addEventListener(
        "gesturechange",
        (e) => {
          e.preventDefault();
          let g = e as SafariGestureEvent;
          engine.zoomAtClient(
            safariGestureStartZoom * g.scale,
            g.clientX,
            g.clientY,
            true,
          );
        },
        { passive: false, signal },
      );
      scroller.addEventListener(
        "gestureend",
        (e) => {
          e.preventDefault();
          safariGestureActive = false;
        },
        { passive: false, signal },
      );
    }

    // Touch events rather than pointer events track the pinch: once the
    // browser starts a native scroll it fires pointercancel and stops
    // delivering pointermove, while touchmove keeps flowing. Cancelling the
    // second finger's touchstart keeps the sequence cancelable, and
    // cancelling the moves stops native scrolling and selection.
    let endPinch = () => {
      if (!pinch) return;
      pinch = null;
      setCanvasPinching(false);
      engine.settleNow();
    };

    scroller.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length < 2) return;
        e.preventDefault();
        if (pinch) return;
        let { dist, mid } = touchPoints(e.touches);
        pinch = {
          state: "unsure",
          startDist: Math.max(dist, 1),
          startMid: mid,
          startZoom: engine.targetZoom(),
          anchorCanvas: engine.canvasPointAt(engine.toViewport(mid.x, mid.y)),
        };
        setCanvasPinching(true);
      },
      { passive: false, signal },
    );

    scroller.addEventListener(
      "touchmove",
      (e) => {
        if (!pinch) return;
        if (e.cancelable) e.preventDefault();
        if (e.touches.length < 2) return;
        let { dist, mid } = touchPoints(e.touches);
        let distChange = Math.abs(dist - pinch.startDist);
        let midMove = Math.hypot(
          mid.x - pinch.startMid.x,
          mid.y - pinch.startMid.y,
        );
        let startZooming = () => {
          pinch!.state = "zooming";
          pinch!.startDist = Math.max(dist, 1);
        };
        if (pinch.state === "unsure") {
          if (distChange > PINCH_ZOOM_THRESHOLD) startZooming();
          else if (midMove > PINCH_PAN_THRESHOLD) pinch.state = "panning";
        } else if (pinch.state === "panning") {
          if (distChange > PINCH_PAN_TO_ZOOM_THRESHOLD) startZooming();
        }
        if (pinch.state === "unsure") return;
        let zoom =
          pinch.state === "zooming"
            ? pinch.startZoom * (dist / pinch.startDist)
            : pinch.startZoom;
        engine.schedule({
          zoom: engine.clamp(zoom),
          anchorViewport: engine.toViewport(mid.x, mid.y),
          anchorCanvas: pinch.anchorCanvas,
          immediate: true,
        });
      },
      { passive: false, signal },
    );

    let onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) endPinch();
    };
    scroller.addEventListener("touchend", onTouchEnd, { signal });
    scroller.addEventListener("touchcancel", onTouchEnd, { signal });

    // While pinching, block drags and selections from seeing the fingers.
    let blockWhilePinching = (e: Event) => {
      if (pinch) e.stopImmediatePropagation();
    };
    for (let type of ["pointermove", "pointerdown", "mousedown"]) {
      window.addEventListener(type, blockWhilePinching, {
        capture: true,
        signal,
      });
    }

    scroller.addEventListener("pointerenter", () => (hovered = true), {
      signal,
    });
    scroller.addEventListener("pointerleave", () => (hovered = false), {
      signal,
    });

    window.addEventListener(
      "keydown",
      (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        let focusInside =
          !!document.activeElement && scroller.contains(document.activeElement);
        if (!hovered && !focusInside) return;
        let dir: 1 | -1 | 0 | null = null;
        if (e.key === "=" || e.key === "+" || e.code === "NumpadAdd") dir = 1;
        else if (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract")
          dir = -1;
        else if (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0")
          dir = 0;
        if (dir === null) return;
        e.preventDefault();
        let zoom = dir === 0 ? 1 : nextStep(engine.targetZoom(), dir);
        engine.zoomAt(zoom, engine.viewportCenter());
      },
      { capture: true, signal },
    );

    scroller.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType !== "touch" || !e.isPrimary || pinch || !doubleTap) {
          down = null;
          return;
        }
        down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      },
      { signal },
    );
    scroller.addEventListener("pointercancel", () => (down = null), { signal });
    scroller.addEventListener(
      "pointerup",
      (e) => {
        let d = down;
        down = null;
        if (!d || d.id !== e.pointerId || pinch) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_MOVE_SLOP)
          return;
        let tap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        let prev = lastTap;
        lastTap = tap;
        if (
          !prev ||
          tap.t - prev.t > DOUBLE_TAP_MS ||
          Math.hypot(tap.x - prev.x, tap.y - prev.y) > DOUBLE_TAP_SLOP
        )
          return;
        lastTap = null;
        if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return;
        let current = engine.targetZoom();
        let zoom =
          current < 1 - 1e-6
            ? 1
            : current >= MAX_ZOOM - 1e-6
              ? engine.minRef.current
              : nextStep(current, 1);
        engine.zoomAtClient(zoom, tap.x, tap.y);
      },
      { signal },
    );

    return () => {
      abort.abort();
      endPinch();
    };
  }, [engine, enabled, doubleTap]);
}
