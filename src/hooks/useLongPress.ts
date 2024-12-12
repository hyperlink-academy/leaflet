import { useRef, useEffect, useState, useCallback, useMemo } from "react";

export const useLongPress = (cb: () => void, cancel?: boolean) => {
  let longPressTimer = useRef<number>();
  let isLongPress = useRef(false);
  let [startPosition, setStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  let onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        return;
      }
      // Set the starting position
      setStartPosition({ x: e.clientX, y: e.clientY });
      isLongPress.current = false;
      longPressTimer.current = window.setTimeout(() => {
        isLongPress.current = true;
        cb();
      }, 500);
    },
    [cb],
  );

  let end = useCallback(() => {
    // Clear the starting position
    setStartPosition(null);
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;
  }, []);

  useEffect(() => {
    if (startPosition) {
      let listener = (e: MouseEvent) => {
        // Calculate the distance moved
        const distance = Math.sqrt(
          Math.pow(e.clientX - startPosition.x, 2) +
            Math.pow(e.clientY - startPosition.y, 2),
        );
        // Only end if the distance is greater than 10 pixels
        if (distance > 16) {
          end();
        }
      };
      window.addEventListener("mousemove", listener);
      let touchListener = (e: TouchEvent) => {
        if (e.touches[0]) {
          const distance = Math.sqrt(
            Math.pow(e.touches[0].clientX - startPosition.x, 2) +
              Math.pow(e.touches[0].clientY - startPosition.y, 2),
          );
          if (distance > 16) {
            end();
          }
        }
      };
      window.addEventListener("touchmove", touchListener);

      return () => {
        window.removeEventListener("mousemove", listener);
        window.removeEventListener("touchmove", touchListener);
      };
    }
  }, [startPosition, end]);

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
