import { useLayoutEffect, useRef } from "react";

const MIN_CANVAS_HEIGHT = 240;
const LINE_HEIGHT_PX = 16;

// A canvas below a publication header scrolls inside its own scroller, so on
// its own the header would never scroll away. This sizes the canvas area to
// the space left below the stuck nav — so the page scrolls exactly far enough
// to collapse the header into just the nav, as on doc pages — and routes
// scrolling that starts on the canvas to the page until the header is gone,
// then back from the canvas's top edge to reveal it again.
//
// Attach the returned ref to the element wrapping the canvas; the page
// scroller is its nearest `.publicationScrollContainer` ancestor and the
// canvas scroller its `.canvasWrapper` descendant.
export function useCollapsingCanvasHeader<T extends HTMLElement>() {
  let ref = useRef<T>(null);

  useLayoutEffect(() => {
    let area = ref.current;
    let page = area?.parentElement?.closest<HTMLElement>(
      ".publicationScrollContainer",
    );
    if (!area || !page) return;
    let abort = new AbortController();
    let signal = abort.signal;

    let fit = () => {
      let nav = page.querySelector<HTMLElement>(".publicationPagesNav");
      // A stuck nav's `top` is measured from inside the scroller's padding.
      let navBottom = nav
        ? (parseFloat(getComputedStyle(page).paddingTop) || 0) +
          (parseFloat(getComputedStyle(nav).top) || 0) +
          nav.offsetHeight
        : 0;
      // scrollHeight never reports less than the viewport, so make the content
      // overflow (the header sits above the area) before measuring below it.
      area.style.height = `${page.clientHeight}px`;
      let pageRect = page.getBoundingClientRect();
      let areaRect = area.getBoundingClientRect();
      let areaBottomInContent =
        areaRect.bottom - pageRect.top - page.clientTop + page.scrollTop;
      let below = page.scrollHeight - areaBottomInContent;
      let height = Math.max(
        MIN_CANVAS_HEIGHT,
        page.clientHeight - navBottom - below,
      );
      area.style.height = `${height}px`;
    };
    fit();
    let observer = new ResizeObserver(fit);
    observer.observe(page);
    let nav = page.querySelector(".publicationPagesNav");
    if (nav) observer.observe(nav);
    signal.addEventListener("abort", () => observer.disconnect());

    let canvasScroller = () =>
      area.querySelector<HTMLElement>(".canvasWrapper");
    let collapseLeft = () =>
      page.scrollHeight - page.clientHeight - page.scrollTop;

    area.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        let deltaY = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT_PX : e.deltaY;
        if (e.deltaMode === 2) deltaY = e.deltaY * page.clientHeight;
        let canvasTop = (canvasScroller()?.scrollTop ?? 0) <= 0;
        if (deltaY > 0 && collapseLeft() > 0.5) {
          e.preventDefault();
          page.scrollTop += Math.min(deltaY, collapseLeft());
        } else if (deltaY < 0 && canvasTop && page.scrollTop > 0) {
          e.preventDefault();
          page.scrollTop += deltaY;
        }
      },
      { passive: false, signal },
    );

    // A touch that pushes the canvas up while the header still shows moves the
    // page instead. The call is made on the first move, while it can still be
    // cancelled; once the browser starts scrolling natively it can't be taken
    // back. Revealing the header needs nothing: a pull at the canvas's top
    // chains to the page natively.
    let touch: { x: number; y: number; mode: "undecided" | "page" | "native" } =
      { x: 0, y: 0, mode: "native" };
    area.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1 || touchActionNone(e.target, area)) {
          touch.mode = "native";
          return;
        }
        let t = e.touches[0];
        touch = { x: t.clientX, y: t.clientY, mode: "undecided" };
      },
      { passive: true, signal },
    );
    area.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length !== 1) {
          touch.mode = "native";
          return;
        }
        let t = e.touches[0];
        let dy = t.clientY - touch.y;
        let dx = t.clientX - touch.x;
        if (touch.mode === "undecided") {
          touch.mode =
            e.cancelable &&
            dy < 0 &&
            Math.abs(dy) >= Math.abs(dx) &&
            collapseLeft() > 0.5
              ? "page"
              : "native";
        }
        if (touch.mode !== "page") return;
        if (e.cancelable) e.preventDefault();
        page.scrollTop -= dy;
        touch.x = t.clientX;
        touch.y = t.clientY;
      },
      { passive: false, signal },
    );

    return () => abort.abort();
  }, []);

  return ref;
}

// Elements that take touches for themselves (ink drawing, drag grippers)
// never scroll, so their gestures shouldn't scroll the page either.
function touchActionNone(target: EventTarget | null, until: HTMLElement) {
  for (
    let el = target instanceof Element ? target : null;
    el && el !== until;
    el = el.parentElement
  ) {
    if (getComputedStyle(el).touchAction === "none") return true;
  }
  return false;
}
