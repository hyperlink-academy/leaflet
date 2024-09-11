import { useCallback, useEffect, useRef, useState } from "react";

export const useDrag = (args: {
  onDrag?: (a: {}) => void;
  onDragEnd: (d: { x: number; y: number }) => void;
  delay?: boolean;
}) => {
  let [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  let timeout = useRef<null | number>(null);
  let isLongPress = useRef(false);

  let onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.defaultPrevented) return;
      if (args.delay) {
        isLongPress.current = true;
        timeout.current = window.setTimeout(() => {
          setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
          setDragDelta({ x: 0, y: 0 });
          timeout.current = null;
        }, 400);
      } else {
        setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        setDragDelta({ x: 0, y: 0 });
      }
    },
    [args.delay],
  );

  let onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return;
      if (args.delay) {
        isLongPress.current = true;
        timeout.current = window.setTimeout(() => {
          timeout.current = null;
        }, 400);
      } else {
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragDelta({ x: 0, y: 0 });
      }
    },
    [args.delay],
  );

  let [dragDelta, setDragDelta] = useState<{
    x: number;
    y: number;
  } | null>(null);
  let currentDragDelta = useRef({ x: 0, y: 0 });
  let end = useCallback(
    (e: { preventDefault: () => void }) => {
      console.log("end???");
      isLongPress.current = false;
      if (timeout.current) {
        window.clearTimeout(timeout.current);
        timeout.current = null;
        return;
      }
      if (args.delay) e.preventDefault();
      console.log(currentDragDelta.current);
      args.onDragEnd({ ...currentDragDelta.current });
      currentDragDelta.current = { x: 0, y: 0 };
      setDragStart(null);
      setDragDelta(null);
    },
    [args.delay, args.onDragEnd],
  );

  useEffect(() => {
    if (!dragStart) return;
    let disconnect = new AbortController();
    window.addEventListener(
      "pointermove",
      (e: PointerEvent) => {
        currentDragDelta.current.x = e.clientX - dragStart.x;
        currentDragDelta.current.y = e.clientY - dragStart.y;
        setDragDelta({ ...currentDragDelta.current });
      },
      { signal: disconnect.signal },
    );

    window.addEventListener(
      "contextmenu",
      (e) => {
        if (isLongPress.current) e.preventDefault();
      },
      { signal: disconnect.signal },
    );

    window.addEventListener("touchend", end, { signal: disconnect.signal });
    window.addEventListener("pointerup", end, { signal: disconnect.signal });
    return () => {
      disconnect.abort();
    };
  }, [dragStart, args, end]);
  let handlers = { onMouseDown, onTouchEnd: end, onTouchStart };
  return { dragDelta, handlers };
};
