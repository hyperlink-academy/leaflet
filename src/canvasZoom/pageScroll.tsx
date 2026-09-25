"use client";
/**
 * A canvas shown below a publication's header and nav scrolls with the page:
 * the page scroller owns vertical scrolling, so one scroll (or one touch
 * swipe) moves the header, the stuck nav and the canvas together, as on a
 * doc page. The canvas box is then as tall as the zoomed canvas and only
 * scrolls sideways, and the zoom engine reads and writes vertical offsets
 * through the page scroller (see CanvasZoomProvider's `pageScroll`).
 *
 * The layout that owns the header wraps the canvas in
 * `useCanvasPageScrollArea`'s element and provides the value it returns;
 * the canvas reads it with `useCanvasPageScroll` (null anywhere else, where
 * the canvas keeps its own scroller).
 */
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";

export type CanvasPageScroll = {
  /** The page scroller the canvas box sits in. */
  scroller: () => HTMLElement | null;
  /**
   * The part of that scroller's client box the canvas shows through: from
   * below the chrome stuck at its top, to where it is clipped on screen.
   */
  viewport: () => { top: number; height: number };
};

const CanvasPageScrollContext = createContext<CanvasPageScroll | null>(null);

export const CanvasPageScrollProvider = CanvasPageScrollContext.Provider;

export function useCanvasPageScroll() {
  return useContext(CanvasPageScrollContext);
}

/**
 * For the element wrapping the canvas box below the header. Its page
 * scroller is its nearest `.publicationScrollContainer` ancestor and the
 * stuck nav that scroller's `.publicationPagesNav`. The viewport is also
 * written to the element as `--canvas-sticky-top`, `--canvas-sticky-bottom`
 * (sticky insets for the canvas's overlays) and `--canvas-viewport-height`
 * (the canvas's minimum height).
 */
export function useCanvasPageScrollArea<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  pageScroll: CanvasPageScroll;
} {
  let ref = useRef<T>(null);
  let viewport = useRef({ top: 0, height: 0 });

  useLayoutEffect(() => {
    let area = ref.current;
    let page = pageScrollerOf(area);
    if (!area || !page) return;
    let fit = () => {
      let nav = page.querySelector<HTMLElement>(".publicationPagesNav");
      // Sticky insets are measured from inside the scroller's padding.
      let pageStyle = getComputedStyle(page);
      let padding = {
        top: parseFloat(pageStyle.paddingTop) || 0,
        bottom: parseFloat(pageStyle.paddingBottom) || 0,
      };
      let stickyTop = nav
        ? (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight
        : 0;
      let top = padding.top + stickyTop;
      let rect = page.getBoundingClientRect();
      let clientTop = rect.top + page.clientTop;
      let clientBottom = clientTop + page.clientHeight;
      let bottom = visibleBottom(page, clientBottom);
      let height = bottom - clientTop - top;
      viewport.current = { top, height };
      area.style.setProperty("--canvas-sticky-top", `${stickyTop}px`);
      area.style.setProperty(
        "--canvas-sticky-bottom",
        `${clientBottom - bottom - padding.bottom}px`,
      );
      area.style.setProperty("--canvas-viewport-height", `${height}px`);
    };
    fit();
    let observer = new ResizeObserver(fit);
    observer.observe(page);
    let nav = page.querySelector(".publicationPagesNav");
    if (nav) observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  let pageScroll = useMemo<CanvasPageScroll>(
    () => ({
      scroller: () => pageScrollerOf(ref.current),
      viewport: () => viewport.current,
    }),
    [],
  );
  return { ref, pageScroll };
}

function pageScrollerOf(area: HTMLElement | null) {
  return (
    area?.parentElement?.closest<HTMLElement>(".publicationScrollContainer") ??
    null
  );
}

// The borderless page card overhangs the bottom of the screen (PageWrapper's
// negative margins), so the scroller's own client box can reach past what
// is visible.
function visibleBottom(el: HTMLElement, bottom: number) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    if (getComputedStyle(n).overflowY !== "visible")
      bottom = Math.min(bottom, n.getBoundingClientRect().bottom);
  }
  return Math.min(bottom, window.innerHeight);
}
