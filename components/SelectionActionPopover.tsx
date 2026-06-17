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
    const handleSelectionChange = () => {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.toString())
        return setState(null);

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const element =
        ancestor.nodeType === Node.ELEMENT_NODE
          ? (ancestor as Element)
          : ancestor.parentElement;
      const container = element?.closest(containerSelector) ?? null;
      if (!container) return setState(null);

      const selectionRect = range.getBoundingClientRect();
      let top = selectionRect.top;

      // Center horizontally on the focus caret (where the drag ended) when
      // available, otherwise on the selection's midpoint. The actual left is
      // resolved against the rendered width in the layout effect above.
      let centerX = selectionRect.left + selectionRect.width / 2;
      if (selection.focusNode) {
        const caret = document.createRange();
        caret.setStart(selection.focusNode, selection.focusOffset);
        caret.setEnd(selection.focusNode, selection.focusOffset);
        centerX = caret.getBoundingClientRect().left;
      }

      // Backward selections end at the top, so float above; forward selections
      // end at the bottom, so float below.
      if (selection.direction === "backward") {
        top -= 28;
      } else {
        top += selectionRect.height + 8;
      }

      const data = resolveRef.current({ selection, range, container });
      if (data === null || data === undefined) return setState(null);
      setState({ top, centerX, data });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
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
