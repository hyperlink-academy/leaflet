import { useCallback, useEffect, useRef, useState } from "react";
import { LONG_PRESS_DELAY, LONG_PRESS_TOLERANCE } from "./useLongPress";

const BODY_DRAG_DISTANCE = 8;

// `handlers` go on a dedicated handle and start the drag on contact.
// `bodyHandlers` go on the dragged thing itself, where presses are also
// clicks, scrolls and pinches: a mouse lifts it after BODY_DRAG_DISTANCE of
// travel, a finger after a still hold.
export const useDrag = (args: {
  onDrag?: (a: {}) => void;
  onDragEnd: (d: { x: number; y: number }) => void;
  // Descendants of the body that keep presses for themselves.
  bodyIgnore?: string;
}) => {
  let [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  let [dragDelta, setDragDelta] = useState<{
    x: number;
    y: number;
  } | null>(null);
  let currentDragDelta = useRef({ x: 0, y: 0 });

  let start = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number } = from) => {
      currentDragDelta.current = { x: to.x - from.x, y: to.y - from.y };
      setDragStart(from);
      setDragDelta({ ...currentDragDelta.current });
    },
    [],
  );

  let onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.defaultPrevented) return;
      start({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    },
    [start],
  );

  let onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return;
      // The browser would otherwise start a text selection at the handle
      // and extend it over whatever the pointer crosses.
      e.preventDefault();
      start({ x: e.clientX, y: e.clientY });
    },
    [start],
  );

  let onBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      let target = e.target as Element;
      // Presses inside a portaled popover bubble here through the React tree.
      if (!e.currentTarget.contains(target)) return;
      if (args.bodyIgnore && target.closest(args.bodyIgnore)) return;

      let from = { x: e.clientX, y: e.clientY };
      let { pointerId, pointerType } = e;
      let press = new AbortController();
      let { signal } = press;
      let lifted = false;
      let lift = (to: { x: number; y: number }) => {
        lifted = true;
        window.getSelection()?.removeAllRanges();
        start(from, to);
      };
      let hold =
        pointerType === "touch"
          ? window.setTimeout(() => lift(from), LONG_PRESS_DELAY)
          : undefined;
      signal.addEventListener("abort", () => window.clearTimeout(hold));

      window.addEventListener(
        "pointermove",
        (move) => {
          if (lifted || move.pointerId !== pointerId) return;
          let travel = Math.hypot(move.clientX - from.x, move.clientY - from.y);
          if (pointerType === "touch") {
            if (travel > LONG_PRESS_TOLERANCE) press.abort();
          } else if (travel >= BODY_DRAG_DISTANCE)
            lift({ x: move.clientX, y: move.clientY });
        },
        { signal },
      );
      // A second finger is a pinch, not a hold.
      window.addEventListener(
        "pointerdown",
        (down) => {
          if (!lifted && down.pointerId !== pointerId) press.abort();
        },
        { signal },
      );
      // Registered with the press rather than on lift: once the browser
      // starts a scroll its touchmoves can no longer be cancelled.
      window.addEventListener(
        "touchmove",
        (move) => {
          if (lifted) move.preventDefault();
        },
        { signal, passive: false },
      );
      // The press itself wasn't cancelled (it still has to focus and click),
      // so the browser goes on selecting text under the moving pointer.
      document.addEventListener(
        "selectionchange",
        () => {
          if (lifted) window.getSelection()?.removeAllRanges();
        },
        { signal },
      );
      window.addEventListener(
        "contextmenu",
        (menu) => {
          if (lifted || pointerType === "touch") menu.preventDefault();
        },
        { signal },
      );

      let release = (up: PointerEvent) => {
        if (up.pointerId !== pointerId) return;
        press.abort();
        if (!lifted) return;
        // The click that follows the drop would otherwise act on whatever
        // the body was dropped with the pointer over.
        let swallow = new AbortController();
        window.addEventListener(
          "click",
          (click) => {
            click.preventDefault();
            click.stopPropagation();
          },
          { capture: true, signal: swallow.signal },
        );
        window.setTimeout(() => swallow.abort());
      };
      window.addEventListener("pointerup", release, { signal });
      window.addEventListener("pointercancel", release, { signal });
    },
    [args.bodyIgnore, start],
  );

  let end = useCallback(() => {
    args.onDragEnd({ ...currentDragDelta.current });
    currentDragDelta.current = { x: 0, y: 0 };
    setDragStart(null);
    setDragDelta(null);
  }, [args.onDragEnd]);

  useEffect(() => {
    let disconnect = new AbortController();
    window.addEventListener(
      "touchmove",
      (e) => {
        if (dragDelta) e.preventDefault();
      },
      { signal: disconnect.signal, passive: false },
    );
    return () => {
      disconnect.abort();
    };
  }, [dragDelta]);

  useEffect(() => {
    if (!dragStart) return;
    let disconnect = new AbortController();
    window.addEventListener(
      "pointermove",
      (e: PointerEvent) => {
        e.preventDefault();
        currentDragDelta.current.x = e.clientX - dragStart.x;
        currentDragDelta.current.y = e.clientY - dragStart.y;
        setDragDelta({ ...currentDragDelta.current });
      },
      { signal: disconnect.signal },
    );

    window.addEventListener("touchend", end, { signal: disconnect.signal });
    window.addEventListener("pointerup", end, { signal: disconnect.signal });
    window.addEventListener("pointercancel", end, {
      signal: disconnect.signal,
    });
    return () => {
      disconnect.abort();
    };
  }, [dragStart, args, end]);
  let handlers = { onMouseDown, onTouchEnd: end, onTouchStart };
  let bodyHandlers = {
    onPointerDown: onBodyPointerDown,
    // A native drag of an image or link inside the body would take the
    // pointer away mid-press.
    onDragStart: preventDefault,
  };
  return { dragDelta, handlers, bodyHandlers };
};

const preventDefault = (e: { preventDefault: () => void }) =>
  e.preventDefault();
