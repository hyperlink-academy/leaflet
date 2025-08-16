import { useRef, useEffect, useCallback, useMemo } from "react";

export const useLongPress = (cb: () => void, cancel?: boolean) => {
  let longPressTimer = useRef<number>(undefined);
  let isLongPress = useRef(false);
  let startPosition = useRef<{
    x: number;
    y: number;
  } | null>(null);
  let mouseMoveListener = useRef<((e: MouseEvent) => void) | null>(null);
  let touchMoveListener = useRef<((e: TouchEvent) => void) | null>(null);

  let end = useCallback(() => {
    // Clear the starting position
    startPosition.current = null;
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;

    // Remove event listeners
    if (mouseMoveListener.current) {
      window.removeEventListener("mousemove", mouseMoveListener.current);
      mouseMoveListener.current = null;
    }
    if (touchMoveListener.current) {
      window.removeEventListener("touchmove", touchMoveListener.current);
      touchMoveListener.current = null;
    }
  }, []);

  let onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      let el = e.target as HTMLElement;
      if (el.tagName === "SELECT") return;
      if (e.button === 2) {
        return;
      }
      // Set the starting position
      startPosition.current = { x: e.clientX, y: e.clientY };

      isLongPress.current = false;

      longPressTimer.current = window.setTimeout(() => {
        isLongPress.current = true;
        cb();
        end();
      }, 500);

      // Add mousemove and touchmove listeners
      mouseMoveListener.current = (e: MouseEvent) => {
        if (!startPosition.current) return;
        // Calculate the distance moved
        const distance = Math.sqrt(
          Math.pow(e.clientX - startPosition.current.x, 2) +
            Math.pow(e.clientY - startPosition.current.y, 2),
        );
        // Only end if the distance is greater than 16 pixels
        if (distance > 16) {
          end();
        }
      };

      touchMoveListener.current = (e: TouchEvent) => {
        if (!startPosition.current || !e.touches[0]) return;
        const distance = Math.sqrt(
          Math.pow(e.touches[0].clientX - startPosition.current.x, 2) +
            Math.pow(e.touches[0].clientY - startPosition.current.y, 2),
        );
        if (distance > 16) {
          end();
        }
      };

      window.addEventListener("mousemove", mouseMoveListener.current);
      window.addEventListener("touchmove", touchMoveListener.current);
    },
    [cb, end],
  );

  let click = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (isLongPress.current) e.preventDefault();
    if (e.shiftKey) e.preventDefault();
  }, []);

  useEffect(() => {
    if (cancel) {
      end();
    }
  }, [cancel, end]);

  return useMemo(
    () => ({
      isLongPress: isLongPress,
      handlers: {
        onPointerDown,
        onPointerUp: end,
        onClickCapture: click,
      },
    }),
    [isLongPress, end, onPointerDown, click],
  );
};
