import { useEffect } from "react";
import type { CanvasZoomEngine } from "./CanvasZoomProvider";
import { MAX_ZOOM, nextStep } from "./math";
import { isCanvasPinching } from "./session";

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;
const TAP_MOVE_SLOP = 10;

// Content a double tap is meant for rather than the canvas behind it.
const INTERACTIVE =
  "a, button, input, textarea, select, video, audio, [contenteditable], [role='button'], .ProseMirror";

/**
 * Double tap (touch only) zooms in around the tap: to 1 when below it,
 * otherwise to the next step; at MAX_ZOOM it returns to the fit-to-width
 * minimum. Detected from pointer events, since iOS does not fire dblclick
 * for taps and the scroller's touch-action already disables the browser's
 * own double-tap zoom. Skipped in the editor for writers (a double tap on
 * empty canvas creates a block there) and on interactive content.
 */
export function useCanvasDoubleTap(engine: CanvasZoomEngine, enabled: boolean) {
  useEffect(() => {
    let scroller = engine.scrollerRef.current;
    if (!scroller || !enabled) return;
    let abort = new AbortController();
    let signal = abort.signal;
    let down: { id: number; x: number; y: number; t: number } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;

    scroller.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType !== "touch" || !e.isPrimary || isCanvasPinching()) {
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
        if (!d || d.id !== e.pointerId || isCanvasPinching()) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_MOVE_SLOP) return;
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
    return () => abort.abort();
  }, [engine, enabled]);
}
