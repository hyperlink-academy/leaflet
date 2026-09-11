import type { ReactNode } from "react";

export type BlockSettingOption<T extends string> = {
  value: T;
  Icon: (props: { selected: boolean }) => ReactNode;
};

// The row of illustrated option cards used by block settings popovers
// (post size, posts-list layout, page link style). `children` renders inside
// the row so a caller can position an extra control against its corner.
export function BlockSettingOptions<T extends string>(props: {
  options: BlockSettingOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  children?: ReactNode;
}) {
  return (
    <div className="relative flex sm:flex-row flex-col sm:gap-1 gap-2 w-full items-stretch">
      {props.options.map((option) => {
        let selected = props.value === option.value;
        return (
          <button
            className={`BlockSettingOption text-left flex flex-col flex-1 pt-1 p-2 outline-2 outline-offset-1 border ${selected ? "accent-container outline-accent-contrast border-accent-contrast " : "opaque-container outline-transparent"}`}
            key={option.value}
            type="button"
            aria-pressed={selected}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => props.onSelect(option.value)}
          >
            <div className="text-xs font-bold text-secondary uppercase pb-1">
              {option.value}
            </div>
            <div className="flex items-center grow w-full">
              <option.Icon selected={selected} />
            </div>
          </button>
        );
      })}
      {props.children}
    </div>
  );
}
