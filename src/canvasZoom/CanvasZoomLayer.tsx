"use client";
import type { CSSProperties, ReactNode } from "react";
import { useCanvasZoomEngine } from "./CanvasZoomProvider";
import type { CanvasArea } from "./mobileView";

// The zoom is never rendered by React: the stylesheet's default applies until
// the engine writes `--canvas-zoom` inline.
export function CanvasZoomLayer(props: {
  /** Canvas px; sizes the spacer before any script runs. */
  contentHeight: number;
  /** Anchored mobile view area, which the stylesheet's default zoom fits. */
  mobileArea?: CanvasArea | null;
  children: ReactNode;
}) {
  let { layerRef, spacerRef, contentWidth, centered, locked } =
    useCanvasZoomEngine();
  return (
    <div
      ref={spacerRef}
      className={`canvasZoomSpacer ${centered ? "canvasZoomCentered" : ""} ${locked ? "canvasZoomLocked" : ""}`}
      style={
        {
          "--canvas-content-width": contentWidth,
          "--canvas-content-height": props.contentHeight,
          "--canvas-mobile-area": props.mobileArea?.width,
          "--canvas-mobile-left": props.mobileArea?.left,
        } as CSSProperties
      }
    >
      <div ref={layerRef} className="canvasZoomLayer">
        {props.children}
      </div>
    </div>
  );
}
