import { useCallback, useEffect, useRef, useState } from "react";

export const useDrag = (args: {
  onDrag?: (a: {}) => void;
  onDragEnd: (d: { x: number; y: number }) => void;
}) => {
  let [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  let onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  let [dragDelta, setDragDelta] = useState<{
    x: number;
    y: number;
  } | null>(null);
  let currentDragDelta = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragStart) return;
    let disconnect = new AbortController();
    window.addEventListener(
      "mousemove",
      (e) => {
        currentDragDelta.current.x = e.clientX - dragStart.x;
        currentDragDelta.current.y = e.clientY - dragStart.y;
        setDragDelta({ ...currentDragDelta.current });
      },
      { signal: disconnect.signal },
    );
    window.addEventListener(
      "mouseup",
      () => {
        console.log(currentDragDelta.current);
        args.onDragEnd({ ...currentDragDelta.current });
        currentDragDelta.current = { x: 0, y: 0 };
        setDragStart(null);
        setDragDelta(null);
      },
      { signal: disconnect.signal },
    );
    return () => {
      disconnect.abort();
    };
  }, [dragStart, args]);
  return { dragDelta, onMouseDown };
};
