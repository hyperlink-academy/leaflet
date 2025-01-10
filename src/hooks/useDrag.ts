import { useCallback, useEffect, useRef, useState } from "react";

export const useDrag = (args: {
  onDrag?: (a: {}) => void;
  onDragEnd: (d: { x: number; y: number }) => void;
  delay?: boolean;
}) => {
  let [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  let touchStart = useRef<null | { x: number; y: number }>(null);
  let timeout = useRef<null | number>(null);
  let isLongPress = useRef(false);

  let onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.defaultPrevented) return;
      if (args.delay) {
        touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
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
      isLongPress.current = false;
      if (timeout.current) {
        window.clearTimeout(timeout.current);
        timeout.current = null;
        return;
      }
      if (args.delay) e.preventDefault();
      args.onDragEnd({ ...currentDragDelta.current });
      currentDragDelta.current = { x: 0, y: 0 };
      setDragStart(null);
      setDragDelta(null);
    },
    [args.delay, args.onDragEnd],
  );
  useEffect(() => {
    let disconnect = new AbortController();
    window.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (args.delay && touchStart.current) {
          const deltaX = e.touches[0].clientX - touchStart.current.x;
          const deltaY = e.touches[0].clientY - touchStart.current.y;
          if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
            if (timeout.current) {
              window.clearTimeout(timeout.current);
              timeout.current = null;
            }
            touchStart.current = null;
          }
        }
        if (dragDelta) e.preventDefault();
      },
      { signal: disconnect.signal, passive: false },
    );
    return () => {
      disconnect.abort();
    };
  }, [args.delay, dragDelta]);

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
