"use client";
import type { CSSProperties, ReactNode } from "react";
import { useCanvasZoomEngine } from "./CanvasZoomProvider";
import type { CanvasArea } from "./mobileView";

// The canvas box, spacer and layer. The zoom is never rendered by React: the
// stylesheet's default applies until the engine writes `--canvas-zoom` inline.
export function CanvasZoomLayer(props: {
  id?: string;
  className?: string;
  /** Canvas px; sizes the spacer before any script runs. */
  contentHeight: number;
  /** Anchored mobile view area, which the stylesheet's default zoom fits. */
  mobileArea?: CanvasArea | null;
  children: ReactNode;
}) {
  let { layerRef, spacerRef, contentWidth, centered, locked, pageScroll } =
    useCanvasZoomEngine();
  return (
    <div
      id={props.id}
      // Not an inline width: the engine rewrites that to fit a scrollbar gutter.
      style={{ "--canvas-width": `${contentWidth}px` } as CSSProperties}
      className={`canvasWrapper w-(--canvas-width) max-w-full ${pageScroll ? "canvasPageScroll" : "h-full overflow-y-scroll"} touch-pan-x touch-pan-y ${props.className ?? ""}`}
    >
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
    </div>
  );
}
