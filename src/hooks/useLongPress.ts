import { useRef, useEffect, useState } from "react";

export const useLongPress = (
  cb: () => void,
  onMouseDown?: (e: React.MouseEvent) => void,
  cancel?: boolean,
) => {
  let longPressTimer = useRef<number>();
  let isLongPress = useRef(false);
  let [isDown, setIsdown] = useState(false);

  let start = (e: React.MouseEvent) => {
    onMouseDown && onMouseDown(e);
    setIsdown(true);
    isLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      cb();
    }, 500);
  };

  useEffect(()=> {
    if (isDown) {
      let listener = (e: MouseEvent) => {
        end() 
      }
      window.addEventListener("mousemove", listener);
      return ()=> {
        window.removeEventListener("mousemove", listener);
      };
    }
  }, [isDown]);

  let end = () => {
    setIsdown(false);
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
