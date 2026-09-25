import { useEffect } from "react";
import type { CanvasZoomEngine } from "./CanvasZoomProvider";
import { type Point, nextStep, wheelToZoomFactor } from "./math";
import { setCanvasPinching } from "./session";

// Finger-distance change before two fingers count as a zoom rather than a
// pan. Kept small so a pinch responds at once; the distance is rebased when
// zooming starts, so crossing the line never applies the dead zone as a jump.
const PINCH_ZOOM_THRESHOLD = 8;
const PINCH_PAN_THRESHOLD = 16;
const PINCH_PAN_TO_ZOOM_THRESHOLD = 48;

type SafariGestureEvent = Event & {
  scale: number;
  clientX: number;
  clientY: number;
};

type PinchState = "unsure" | "panning" | "zooming";

type Pinch = {
  state: PinchState;
  startDist: number;
  startMid: Point;
  startZoom: number;
  anchorCanvas: Point;
};

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function touchPoints(touches: TouchList) {
  let a = touches[0];
  let b = touches[1];
  return {
    dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
    mid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
  };
}

export function useCanvasZoomGestures(
  engine: CanvasZoomEngine,
  enabled = true,
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

    scroller.addEventListener(
      "wheel",
      (e) => {
        if (safariGestureActive) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        // deltaY must be read before deltaMode; see wheelToZoomFactor.
        let deltaY = e.deltaY;
        let deltaMode = e.deltaMode;
        let factor = wheelToZoomFactor(deltaY, deltaMode);
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
    // cancelling the moves is what stops native scrolling and selection for
    // it (an inline touch-action toggle would only add a style recalc and a
    // full layer repaint at each end of the pinch).
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
        let startZoom = engine.targetZoom();
        pinch = {
          state: "unsure",
          startDist: Math.max(dist, 1),
          startMid: mid,
          startZoom,
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

    return () => {
      abort.abort();
      endPinch();
    };
  }, [engine, enabled]);
}
