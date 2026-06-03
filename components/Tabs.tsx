import { type ReactNode } from "react";

export function Tabs<T extends string>(props: {
  value: T;
  onChange: (value: T, e?: React.MouseEvent) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
}) {
  return (
    <div className="w-full">
      <div
        className={`tabs flex gap-4 justify-start w-full ${props.className || ""}`}
      >
        {props.options.map((option) => {
          const selected = props.value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`tab text-sm font-bold  pb-0.5 px-1 border-b-3 ${
                selected
                  ? `text-accent-contrast   border-accent-contrast ${props.selectedOptionClassName || ""}`
                  : "text-tertiary border-transparent"
              } ${props.optionClassName || ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onChange(option.value, e);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <hr className="border-border-light" />
    </div>
  );
}
