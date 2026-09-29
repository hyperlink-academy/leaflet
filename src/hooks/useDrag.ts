import { useCallback, useEffect, useRef, useState } from "react";
import { LONG_PRESS_DELAY, LONG_PRESS_TOLERANCE } from "./useLongPress";

const BODY_DRAG_DISTANCE = 8;

// The pointerup, compatibility mouse events and click that trail a drop are
// indistinguishable from a tap to anything that acts on those.
let lastBodyDropAt = 0;
export const didBodyDragJustEnd = () => Date.now() - lastBodyDropAt < 250;

type BodyPress = { target: Element; x: number; y: number };

// `handlers` go on a dedicated handle and start the drag on contact.
// `bodyHandlers` go on the dragged thing itself, where presses are also
// clicks, scrolls and pinches: a mouse lifts it after BODY_DRAG_DISTANCE of
// travel, a finger after a still hold.
export const useDrag = (args: {
  onDrag?: (a: {}) => void;
  onDragEnd: (d: { x: number; y: number }) => void;
  // Descendants of the body that keep presses for themselves.
  bodyIgnore?: string;
  // Text in the body, which a mouse would focus and start selecting from the
  // moment it goes down. The press is kept from it, and one that ends
  // without lifting the body is handed to `onClick` to focus instead.
  bodyText?: { selector: string; onClick: (press: BodyPress) => void };
}) => {
  let latest = useRef(args);
  latest.current = args;
  let withheld = useRef(false);
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
      let { bodyIgnore, bodyText } = latest.current;
      if (bodyIgnore && target.closest(bodyIgnore)) return;
      let text =
        bodyText && target.closest(bodyText.selector) ? bodyText : null;
      // Modified clicks on text extend a selection or open a link.
      if (text && (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey)) return;

      let from = { x: e.clientX, y: e.clientY };
      let { pointerId, pointerType } = e;
      // A finger only reaches the text with the mouse events that follow
      // its release.
      let withhold = !!text && pointerType !== "touch";
      withheld.current = withhold;
      let press = new AbortController();
      let { signal } = press;
      let lifted = false;
      // Clearing the selection would take the caret from an editor the
      // press never touched.
      let clearSelection = () => {
        if (!withhold) window.getSelection()?.removeAllRanges();
      };
      let lift = (to: { x: number; y: number }) => {
        lifted = true;
        clearSelection();
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
      // starts a scroll its touchmoves can no longer be cancelled. A touch
      // stays with the element it started on, and stops bubbling to the
      // window if a re-render takes that element out of the document.
      for (let on of [window, target])
        on.addEventListener(
          "touchmove",
          (move) => {
            if (lifted && move.cancelable) move.preventDefault();
          },
          { signal, passive: false },
        );
      // The press itself wasn't cancelled (it still has to focus and click),
      // so the browser goes on selecting text under the moving pointer.
      document.addEventListener(
        "selectionchange",
        () => {
          if (lifted) clearSelection();
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
        withheld.current = false;
        if (!lifted) {
          if (withhold && up.type === "pointerup")
            text?.onClick({ target, x: up.clientX, y: up.clientY });
          return;
        }
        lastBodyDropAt = Date.now();
        // What follows the drop would otherwise act on whatever the body was
        // dropped with the pointer over. A finger's mouse events trail its
        // release by a moment; a mouse's click comes in the same breath.
        let swallow = new AbortController();
        for (let type of ["mousedown", "click"])
          window.addEventListener(
            type,
            (after) => {
              after.preventDefault();
              after.stopPropagation();
            },
            { capture: true, signal: swallow.signal },
          );
        window.setTimeout(
          () => swallow.abort(),
          pointerType === "touch" ? 250 : 0,
        );
      };
      // Captured, so the drop is on record before any handler of the release
      // asks didBodyDragJustEnd.
      for (let type of ["pointerup", "pointercancel"] as const)
        window.addEventListener(type, release, { signal, capture: true });
    },
    [start],
  );

  let onBodyMouseDownCapture = useCallback((e: React.MouseEvent) => {
    if (!withheld.current) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

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
    onMouseDownCapture: onBodyMouseDownCapture,
    // A native drag of an image or link inside the body would take the
    // pointer away mid-press.
    onDragStart: preventDefault,
  };
  return { dragDelta, handlers, bodyHandlers };
};

const preventDefault = (e: { preventDefault: () => void }) =>
  e.preventDefault();
