import { CheckboxChecked } from "./Icons/CheckboxChecked";
import { CheckboxEmpty } from "./Icons/CheckboxEmpty";
import { Props } from "./Icons/Props";
import React, { forwardRef, type JSX } from "react";

export function Checkbox(props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  className?: string;
  small?: boolean;
}) {
  return (
    <label
      className={`flex w-full gap-2 items-start cursor-pointer ${props.className} ${props.checked ? "text-primary font-bold " : " text-tertiary font-normal"} ${props.small && "text-sm"}`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        className="hidden"
        onChange={(e) => props.onChange(e)}
      />
      {!props.checked ? (
        <CheckboxEmpty
          className={`shrink-0 text-tertiary ${props.small ? "mt-1" : "mt-[6px]"}`}
        />
      ) : (
        <CheckboxChecked
          className={`shrink-0 text-accent-contrast ${props.small ? "mt-1" : "mt-[6px]"}`}
        />
      )}
      {props.children}
    </label>
  );
}

type RadioProps = Omit<JSX.IntrinsicElements["input"], "content">;

export function Radio(
  props: {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children: React.ReactNode;
    radioEmptyClassName?: string;
    radioCheckedClassName?: string;
  } & JSX.IntrinsicElements["input"],
) {
  return (
    <label
      htmlFor={props.id}
      className={`flex gap-2 items-start cursor-pointer shrink-0 ${props.checked ? "text-primary font-bold " : " text-tertiary font-normal"}`}
    >
      <input
        type="radio"
        name={props.name}
        id={props.id}
        value={props.value}
        checked={props.checked}
        className="hidden"
        onChange={(e) => props.onChange(e)}
      />
      {!props.checked ? (
        <RadioEmpty
          className={`shrink-0 mt-[6px] text-tertiary ${props.radioEmptyClassName}`}
        />
      ) : (
        <RadioChecked
          className={`shrink-0 mt-[6px] text-accent-contrast ${props.radioCheckedClassName}`}
        />
      )}
      {props.children}
    </label>
  );
}

const RadioEmpty = (props: Props) => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11ZM6 12C9.31371 12 12 9.31371 12 6C12 2.68629 9.31371 0 6 0C2.68629 0 0 2.68629 0 6C0 9.31371 2.68629 12 6 12Z"
        fill="currentColor"
      />
    </svg>
  );
};

const RadioChecked = (props: Props) => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 10.5C8.48528 10.5 10.5 8.48528 10.5 6C10.5 3.51472 8.48528 1.5 6 1.5C3.51472 1.5 1.5 3.51472 1.5 6C1.5 8.48528 3.51472 10.5 6 10.5ZM6 12C9.31371 12 12 9.31371 12 6C12 2.68629 9.31371 0 6 0C2.68629 0 0 2.68629 0 6C0 9.31371 2.68629 12 6 12Z"
        fill="currentColor"
      />
      <path
        d="M9 6C9 7.65685 7.65685 9 6 9C4.34315 9 3 7.65685 3 6C3 4.34315 4.34315 3 6 3C7.65685 3 9 4.34315 9 6Z"
        fill="currentColor"
      />
    </svg>
  );
};
