"use client";
/**
 * A canvas page shown below a publication's header and nav scrolls with the
 * page, like a doc page: the page scroller owns vertical scrolling, so one
 * native scroll moves the header, the stuck nav and the canvas together and
 * the header scrolls away leaving the nav. The canvas box is as tall as the
 * zoomed canvas and only scrolls sideways (CanvasZoomProvider's
 * `pageScroll`).
 *
 * The layout that owns the header wraps the box in a CanvasPageArea and
 * puts the canvas's overlays in CanvasOverlay strips beside the box.
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { nearestScroller, useCanvasZoomEngine } from "./CanvasZoomProvider";

/**
 * Wraps the canvas box. Writes to itself, from the page scroller and the
 * nav stuck at its top (`.publicationPagesNav`):
 *   --canvas-nav-bottom       where the stuck nav ends, as a sticky inset:
 *                             the top overlay strip sticks below it
 *   --canvas-viewport-height  the page viewport below the nav: the canvas is
 *                             at least this tall, so an empty canvas still
 *                             lets the header scroll away
 * The host sets `--canvas-sticky-bottom` where its scrollport reaches below
 * the screen (a borderless page card overhangs the window).
 */
export function CanvasPageArea(props: {
  className?: string;
  children: ReactNode;
}) {
  let ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let area = ref.current;
    let scroller = nearestScroller(area);
    if (!area || !scroller) return;
    let nav = scroller.querySelector<HTMLElement>(".publicationPagesNav");
    let fit = () => {
      // Sticky insets are measured from inside the scroller's padding, so
      // the nav's end as a sticky inset (for the top strip) sits that much
      // lower in the scrollport.
      let paddingTop = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
      let navBottom = nav
        ? (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight
        : 0;
      let stickyBottom =
        parseFloat(
          getComputedStyle(area).getPropertyValue("--canvas-sticky-bottom"),
        ) || 0;
      area.style.setProperty("--canvas-nav-bottom", `${navBottom}px`);
      area.style.setProperty(
        "--canvas-viewport-height",
        `${scroller.clientHeight - paddingTop - navBottom - stickyBottom}px`,
      );
    };
    fit();
    let observer = new ResizeObserver(fit);
    observer.observe(scroller);
    if (nav) observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`canvasPageArea relative w-full ${props.className ?? ""}`}
    >
      {props.children}
    </div>
  );
}

/**
 * Holds controls drawn over the canvas (zoom controls, add buttons,
 * toolbars), each positioned absolutely with `top-*` or `bottom-*` classes.
 * In a page-scrolled canvas the strip is a zero-height sticky line at the
 * viewport's edge, rendered beside the box (the top strip before it, the
 * bottom strip after it) so the controls stay on screen over a tall canvas.
 * Elsewhere the controls sit against the page card as they always have.
 */
export function CanvasOverlay(props: {
  edge: "top" | "bottom";
  children: ReactNode;
}) {
  let { pageScroll } = useCanvasZoomEngine();
  if (!pageScroll) return <>{props.children}</>;
  return (
    <div
      className={`canvasOverlay sticky w-full h-0 z-20 ${props.edge === "top" ? "canvasOverlayTop" : "canvasOverlayBottom"}`}
    >
      {props.children}
    </div>
  );
}
