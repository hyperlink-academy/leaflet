"use client";
import { useEffect, useRef, useState, type JSX } from "react";
import { onMouseDown } from "src/utils/iosInputMouseDown";
import { isIOS } from "src/utils/isDevice";

export const Input = (
  props: {
    textarea?: boolean;
  } & JSX.IntrinsicElements["input"] &
    JSX.IntrinsicElements["textarea"],
) => {
  let { textarea, ...inputProps } = props;
  let ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isIOS()) return;
    if (props.autoFocus) {
      focusElement(ref.current);
    }
  }, [props.autoFocus]);

  if (textarea) return <textarea {...inputProps} />;
  return (
    <input
      {...inputProps}
      autoFocus={isIOS() ? false : props.autoFocus}
      ref={ref}
      onMouseDown={onMouseDown}
    />
  );
};

export const AsyncValueInput = (
  props: {
    textarea?: boolean;
  } & JSX.IntrinsicElements["input"] &
    JSX.IntrinsicElements["textarea"],
) => {
  let [intermediateState, setIntermediateState] = useState(
    props.value as string,
  );

  useEffect(() => {
    setIntermediateState(props.value as string);
  }, [props.value]);

  return (
    <Input
      {...props}
      value={intermediateState}
      onChange={async (e) => {
        if (!props.onChange) return;
        setIntermediateState(e.currentTarget.value);
        await Promise.all([
          props.onChange(e as React.ChangeEvent<HTMLInputElement>),
        ]);
      }}
    />
  );
};

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
  let style = `appearance-none w-full font-normal not-italic bg-transparent text-base text-primary focus:outline-0 ${props.className} outline-hidden resize-none disabled:text-tertiary disabled:cursor-not-allowed`;
  return (
    <label
      className={`input-with-border flex flex-col gap-px text-sm text-tertiary font-bold italic leading-tight py-1! px-[6px]! ${props.disabled && "bg-border-light! cursor-not-allowed!"}`}
    >
      {props.label}
      {textarea ? (
        <textarea {...inputProps} className={style} />
      ) : (
        <Input {...inputProps} className={style} />
      )}
    </label>
  );
};
