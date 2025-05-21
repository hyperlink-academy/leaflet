"use client";
import { useCallback, useEffect, useRef, type JSX } from "react";
import { onMouseDown } from "src/utils/iosInputMouseDown";
import { isIOS } from "src/utils/isDevice";

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
    textarea?: boolean;
  } & JSX.IntrinsicElements["input"] &
    JSX.IntrinsicElements["textarea"],
) => {
  let { label, textarea, ...inputProps } = props;
  let style = `appearance-none w-full font-normal bg-transparent text-base text-primary focus:outline-0 ${props.className} outline-none resize-none`;
  return (
    <label className=" input-with-border flex flex-col text-sm text-tertiary font-bold italic leading-tight !py-1 !px-[6px]">
      {props.label}
      {textarea ? (
        <textarea {...inputProps} className={style} />
      ) : (
        <Input {...inputProps} className={style} />
      )}
    </label>
  );
};
