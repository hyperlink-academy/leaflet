import { type ReactNode } from "react";

export function Tabs<T extends string>(props: {
  value: T;
  onChange: (value: T, e?: React.MouseEvent) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
  pill?: boolean;
}) {
  return (
    <div className="w-full">
      <div
        className={`tabs flex  justify-start w-full overflow-x-auto no-scrollbar ${props.pill ? "gap-3" : "gap-4"} ${props.className || ""}`}
      >
        {props.options.map((option) => {
          const selected = props.value === option.value;

          let pillStyles = `text-sm font-bold px-1  ${
            selected
              ? `text-accent-2  bg-accent-1 rounded-md ${props.selectedOptionClassName || ""}`
              : "text-tertiary bg-transparent"
          }`;
          let tabStyles = `text-sm font-bold  pb-0.5 px-1 border-b-3 ${
            selected
              ? `text-accent-contrast   border-accent-contrast ${props.selectedOptionClassName || ""}`
              : "text-tertiary border-transparent"
          } `;

          return (
            <button
              key={option.value}
              type="button"
              className={`tab shrink-0 whitespace-nowrap ${props.pill ? pillStyles : tabStyles} ${props.optionClassName || ""}`}
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
      {!props.pill && <hr className="border-border-light" />}
    </div>
  );
}
