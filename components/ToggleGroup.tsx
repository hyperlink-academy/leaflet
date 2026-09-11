import { type ReactNode } from "react";

export function ToggleGroup<T extends string>(props: {
  value: T;
  onChange: (value: T, e?: React.MouseEvent) => void;
  options: { value: T; label: ReactNode }[];
  // "light" swaps the accent track for a light-container one, for places the
  // accent color would compete with surrounding content.
  background?: "accent" | "light";
  className?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
  fullWidth?: boolean;
}) {
  let light = props.background === "light";
  return (
    <div
      className={`flex gap-1 p-1 text-sm rounded-lg ${light ? "bg-bg-light border border-border-light" : "bg-accent-1"} ${props.fullWidth ? "w-full" : "w-fit"} ${props.className || ""}`}
    >
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`px-1 rounded-md font-bold ${props.fullWidth ? "flex-1" : ""} ${
            props.value === option.value
              ? `${light ? "bg-bg-page text-secondary border border-border-light" : "bg-accent-2 text-accent-1"} ${props.selectedOptionClassName}`
              : `bg-transparent ${light ? "text-tertiary border border-transparent" : "text-accent-2"}`
          }
          ${props.optionClassName}
            `}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
