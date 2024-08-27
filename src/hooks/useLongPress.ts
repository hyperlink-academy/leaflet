import { useRef, useEffect, useState } from "react";

export const useLongPress = (
  cb: () => void,
  onMouseDown?: (e: React.MouseEvent) => void,
  cancel?: boolean,
) => {
  let longPressTimer = useRef<number>();
  let isLongPress = useRef(false);
  // Change isDown to store the starting position
  let [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);

  let start = (e: React.MouseEvent) => {
    onMouseDown && onMouseDown(e);
    // Set the starting position
    setStartPosition({ x: e.clientX, y: e.clientY });
    isLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      cb();
    }, 500);
  };

  useEffect(() => {
    if (startPosition) {
      let listener = (e: MouseEvent) => {
        // Calculate the distance moved
        const distance = Math.sqrt(
          Math.pow(e.clientX - startPosition.x, 2) + Math.pow(e.clientY - startPosition.y, 2)
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
  }, [startPosition]);

  let end = () => {
    // Clear the starting position
    setStartPosition(null);
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;
  };

  let click = (e: React.MouseEvent | React.PointerEvent) => {
    if (isLongPress.current) e.preventDefault();
    if (e.shiftKey) e.preventDefault();
  };

  useEffect(() => {
    if (cancel) {
      end();
    }
  }, [cancel]);

  return {
    isLongPress: isLongPress,
    handlers: {
      onMouseDown: start,
      onMouseUp: end,
      onClickCapture: click,
    },
  };
};
