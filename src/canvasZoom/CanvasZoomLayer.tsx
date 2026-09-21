"use client";
import type { CSSProperties, ReactNode } from "react";
import { useCanvasZoomEngine } from "./CanvasZoomProvider";
import type { CanvasArea } from "./mobileView";

/**
 * The zoom itself is never rendered by React: the stylesheet defaults
 * `--canvas-zoom` to fit-to-width capped at 1 (so the server-rendered page
 * already shows the right scale) and the engine overwrites the property
 * inline. `contentHeight` is the content's laid-out height in canvas px,
 * which sizes the spacer before any script runs.
 */
export function CanvasZoomLayer(props: {
  contentHeight: number;
  /** Anchored mobile view area; the stylesheet's default zoom fits it. */
  mobileArea?: CanvasArea | null;
  children: ReactNode;
}) {
  let { layerRef, spacerRef, contentWidth } = useCanvasZoomEngine();
  return (
    <div
      ref={spacerRef}
      className="canvasZoomSpacer"
      style={
        {
          "--canvas-content-width": contentWidth,
          "--canvas-content-height": props.contentHeight,
          "--canvas-mobile-area": props.mobileArea?.width,
        } as CSSProperties
      }
    >
      <div ref={layerRef} className="canvasZoomLayer">
        {props.children}
      </div>
    </div>
  );
}
