"use client";
import type { ReactNode } from "react";
import { useCanvasZoomEngine } from "./CanvasZoomProvider";

/**
 * Holds controls drawn over the canvas (zoom controls, add buttons,
 * toolbars), each positioned absolutely against the canvas viewport: the
 * whole scroller, or, when the page scroller owns vertical scrolling and
 * the canvas box is as tall as the canvas, the part of the box on screen.
 * Then the overlay is a zero-height strip stuck to the viewport's edge, so
 * a control anchored to that edge stays put: the top strip renders before
 * the scroller and holds `top-*` controls, the bottom strip after it and
 * holds `bottom-*` ones (`--canvas-sticky-top` / `--canvas-sticky-bottom`
 * from useCanvasPageScrollArea). Both render inside the positioned element
 * around the scroller.
 */
export function CanvasOverlay(props: {
  edge: "top" | "bottom";
  children: ReactNode;
}) {
  let { pageScroll } = useCanvasZoomEngine();
  if (!pageScroll)
    return (
      <div className="canvasOverlay absolute inset-0 z-20">
        {props.children}
      </div>
    );
  return (
    <div
      className={`canvasOverlay sticky h-0 z-20 ${props.edge === "top" ? "canvasOverlayTop" : "canvasOverlayBottom"}`}
    >
      <div
        className={`absolute inset-x-0 h-0 ${props.edge === "top" ? "top-0" : "bottom-0"}`}
      >
        {props.children}
      </div>
    </div>
  );
}
