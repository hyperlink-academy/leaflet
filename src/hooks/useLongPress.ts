import { useRef, useEffect, useState, useCallback } from "react";

export const useLongPress = (
  cb: () => void,
  propsOnMouseDown?: (e: React.MouseEvent) => void,
  cancel?: boolean,
) => {
  let longPressTimer = useRef<number>();
  let isLongPress = useRef(false);
  // Change isDown to store the starting position
  let [startPosition, setStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  let onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      propsOnMouseDown && propsOnMouseDown(e);
      // Set the starting position
      setStartPosition({ x: e.clientX, y: e.clientY });
      isLongPress.current = false;
      longPressTimer.current = window.setTimeout(() => {
        isLongPress.current = true;
        cb();
      }, 500);
    },
    [propsOnMouseDown, cb],
  );

  let onTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      cb();
    }, 500);
  }, [cb]);

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
      return () => {
        window.removeEventListener("mousemove", listener);
      };
    }
  }, [startPosition, end]);

  let click = (e: React.MouseEvent | React.PointerEvent) => {
    if (isLongPress.current) e.preventDefault();
    if (e.shiftKey) e.preventDefault();
  };

  useEffect(() => {
    if (cancel) {
      end();
    }
  }, [cancel, end]);

  return {
    isLongPress: isLongPress,
    handlers: {
      onMouseDown,
      onMouseUp: end,
      onTouchStart: onTouchStart,
      onTouchEnd: end,
      onClickCapture: click,
    },
  };
};
