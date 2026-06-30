"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SelectionContext = {
  selection: Selection;
  range: Range;
  // The element matched by `containerSelector` that the selection lives within.
  container: Element;
};

// A floating toolbar that tracks the live text selection. It listens to
// `selectionchange`, shows itself when a non-empty selection falls inside an
// element matching `containerSelector`, and positions itself next to the
// selection (below for a forward selection, above for a backward one), clamped
// to the viewport. `resolve` derives whatever data the buttons need from the
// selection and can veto the popover by returning null; `children` renders the
// buttons with that data. Extracted from the published-post quote/share
// handler so the editor can reuse the same chrome for an in-text comment
// action.
export function SelectionActionPopover<T>(props: {
  containerSelector: string;
  resolve: (ctx: SelectionContext) => T | null;
  children: (data: T) => ReactNode;
  id?: string;
  className?: string;
}) {
  let [state, setState] = useState<{
    top: number;
    // Horizontal point to center the popover on (the focus caret).
    centerX: number;
    data: T;
  } | null>(null);

  // Kept in a ref so passing inline `resolve` callbacks doesn't re-subscribe
  // the listener on every render.
  let resolveRef = useRef(props.resolve);
  resolveRef.current = props.resolve;

  // Center on the actual rendered width — the popover's size depends on which
  // buttons the consumer renders, so a fixed offset would mis-center it. Done
  // in a layout effect (before paint) to avoid a visible jump.
  let popoverRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!state || !popoverRef.current) return;
    let width = popoverRef.current.offsetWidth;
    let left = Math.max(
      8,
      Math.min(state.centerX - width / 2, window.innerWidth - width - 8),
    );
    popoverRef.current.style.left = `${left}px`;
  }, [state]);

  let { containerSelector } = props;
  useEffect(() => {
    // Locate the live selection if it falls inside a matching container.
    const locate = (): SelectionContext | null => {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.toString())
        return null;

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const element =
        ancestor.nodeType === Node.ELEMENT_NODE
          ? (ancestor as Element)
          : ancestor.parentElement;
      const container = element?.closest(containerSelector) ?? null;
      if (!container) return null;
      return { selection, range, container };
    };

    // Geometry only — viewport-relative, so re-running it on scroll re-pins the
    // popover to the selection without re-resolving the (unchanged) data.
    const measure = (selection: Selection, range: Range) => {
      // Per-line rects, so we can anchor on the line the selection's focus sits
      // on (the last line for a forward selection, the first for a backward
      // one) rather than the multi-line bounding box — whose midpoint can land
      // far from the text, e.g. at the screen edge on a select-all (ctrl+a).
      const rects = range.getClientRects();
      const backward = selection.direction === "backward";
      const focusRect =
        (backward ? rects[0] : rects[rects.length - 1]) ??
        range.getBoundingClientRect();

      // Anchor on the focus edge of that line (where the drag ended): the right
      // edge for a forward selection, the left for a backward one. The actual
      // left is resolved against the rendered width in the layout effect above.
      const centerX = backward ? focusRect.left : focusRect.right;
      // Backward selections end at the top, so float above; forward selections
      // end at the bottom, so float below.
      const top = backward ? focusRect.top - 28 : focusRect.bottom + 8;
      return { top, centerX };
    };

    const handleSelectionChange = () => {
      const ctx = locate();
      if (!ctx) return setState(null);
      const data = resolveRef.current(ctx);
      if (data === null || data === undefined) return setState(null);
      setState({ ...measure(ctx.selection, ctx.range), data });
    };

    // Keep a visible popover pinned to the selection as the page (or any nested
    // scroll container) scrolls. The selection is unchanged, so we only
    // re-measure and reuse the resolved data; throttled to a frame since scroll
    // fires rapidly.
    let frame = 0;
    const reposition = () => {
      frame = 0;
      setState((prev) => {
        if (!prev) return prev;
        const ctx = locate();
        if (!ctx) return prev;
        return { ...prev, ...measure(ctx.selection, ctx.range) };
      });
    };
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(reposition);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    // Capture so scrolls on inner containers (which don't bubble) are caught.
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [containerSelector]);

  if (!state) return null;
  return (
    <div
      ref={popoverRef}
      id={props.id}
      className={
        props.className ??
        "z-20 accent-container border border-border-light text-accent-contrast px-1 flex gap-1 text-sm justify-center text-center items-center"
      }
      // left is a first guess; the layout effect re-centers it on the rendered
      // width before paint.
      style={{ position: "fixed", top: state.top, left: state.centerX }}
    >
      {props.children(state.data)}
    </div>
  );
}
