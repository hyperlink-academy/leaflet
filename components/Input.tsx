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
      focusElement(ref.current);
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

export const focusElement = (el?: HTMLInputElement | null) => {
  if (!isIOS()) {
    el?.focus();
    return;
  }

  let fakeInput = document.createElement("input");
  fakeInput.setAttribute("type", "text");
  fakeInput.style.position = "fixed";
  fakeInput.style.height = "0px";
  fakeInput.style.width = "0px";
  fakeInput.style.fontSize = "16px"; // disable auto zoom
  document.body.appendChild(fakeInput);
  fakeInput.focus();
  setTimeout(() => {
    if (!el) return;
    el.style.transform = "translateY(-2000px)";
    el?.focus();
    fakeInput.remove();
    el.value = " ";
    el.setSelectionRange(1, 1);
    requestAnimationFrame(() => {
      if (el) {
        el.style.transform = "";
      }
    });
    setTimeout(() => {
      if (!el) return;
      el.value = "";
      el.setSelectionRange(0, 0);
    }, 50);
  }, 20);
};

export const InputWithLabel = (
  props: {
    label: string;
  } & JSX.IntrinsicElements["input"],
) => {
  let { label, ...inputProps } = props;
  return (
    <div>
      <div className="input-with-border flex flex-col">
        <label>
          <div className="text-sm text-tertiary font-bold italic leading-none pt-0.5">
            {props.label}
          </div>
          <Input
            {...inputProps}
            className={`appearance-none w-full font-normal bg-transparent text-base text-primary focus:outline-0 ${props.className}`}
          />
        </label>
      </div>
    </div>
  );
};
