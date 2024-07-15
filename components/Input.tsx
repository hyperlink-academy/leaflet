import { isIOS } from "@react-aria/utils";
import { useCallback, useEffect, useRef } from "react";
import { onMouseDown } from "src/utils/iosInputMouseDown";

export function Input(
  props: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >,
) {
  let ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isIOS()) return;
    if (props.autoFocus) {
      setTimeout(() => {
        if (!ref.current) return;
        ref.current.style.transform = "translateY(-2000px)";
        ref.current?.focus();
        ref.current.value = " ";
        ref.current.setSelectionRange(1, 1);
        setTimeout(() => {
          if (!ref.current) return;
          ref.current.value = "";
          ref.current.setSelectionRange(0, 0);
        }, 10);
        requestAnimationFrame(() => {
          if (ref.current) ref.current.style.transform = "";
        });
      }, 20);
    }
  }, [props.autoFocus]);

  return (
    <input
      {...props}
      autoFocus={isIOS() ? false : props.autoFocus}
      ref={ref}
      onMouseDown={onMouseDown}
    />
  );
}
