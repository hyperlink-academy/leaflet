"use client";
import { useEffect } from "react";
import { pageOfParent } from "src/utils/blockGroups";
import { useUIState } from "src/useUIState";
import { elementId } from "src/utils/elementId";
import { useCanvasZoomEngine } from "./CanvasZoomProvider";

const EDGE_MARGIN = 24;

/**
 * Editor only. Focusing a block on a coarse-pointer device while the canvas
 * is zoomed out (fit-to-width on a phone) zooms it to 1 so the text is
 * legible and editable, moving the block's top-left to where it is on
 * screen (kept inside the viewport by a margin so the block lands in view).
 * Blur leaves the zoom alone.
 */
export function CanvasFocusZoom(props: { pageEntityID: string }) {
  let engine = useCanvasZoomEngine();
  let focused = useUIState((s) =>
    s.focusedEntity?.entityType === "block" &&
    pageOfParent(s.focusedEntity.parent) === props.pageEntityID
      ? s.focusedEntity.entityID
      : null,
  );
  useEffect(() => {
    if (!focused) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (engine.zoomRef.current >= 1 - 1e-6) return;
    let box = engine.boxRef.current;
    let el = document.getElementById(elementId.block(focused).container);
    if (!box || !el || !box.contains(el)) return;
    let rect = el.getBoundingClientRect();
    let vr = engine.viewportRect();
    let anchorCanvas = engine.canvasPointAt(
      engine.toViewport(rect.left, rect.top),
    );
    let anchorViewport = engine.toViewport(
      Math.min(
        Math.max(rect.left, vr.left + EDGE_MARGIN),
        vr.left + vr.width - EDGE_MARGIN,
      ),
      Math.min(
        Math.max(rect.top, vr.top + EDGE_MARGIN),
        vr.top + vr.height - EDGE_MARGIN,
      ),
    );
    engine.schedule({ zoom: engine.clamp(1), anchorViewport, anchorCanvas });
  }, [focused, engine]);
  return null;
}
