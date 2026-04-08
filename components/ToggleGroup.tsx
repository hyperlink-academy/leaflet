import { type ReactNode } from "react";

export function ToggleGroup<T extends string>(props: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  optionClassName?: string;
}) {
  return (
    <div
      className={`flex gap-1 p-1 bg-accent-1 rounded-lg text-sm w-fit ${props.className || ""}`}
    >
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`px-1 rounded-md font-bold ${
            props.value === option.value
              ? "bg-accent-2  text-accent-1"
              : "bg-transparent text-accent-2"
          }
          ${props.optionClassName}
            `}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
