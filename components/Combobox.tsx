import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { NestedCardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { Input } from "./Input";

export const Combobox = ({
  results,
  onSelect,
  children,
  onOpenChange,
  highlighted,
  setHighlighted,
  searchValue,
  setSearchValue,
  showSearch,
  trigger,
  triggerClassName,
  className,
  sideOffset,
  open: openProp,
  zIndex,
}: {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  className?: string;
  width?: string;
  results: string[];
  onSelect?: () => void;
  onOpenChange?: (open: boolean) => void;
  highlighted: string | undefined;
  setHighlighted: (h: string | undefined) => void;
  searchValue?: string;
  setSearchValue?: (s: string) => void;
  showSearch?: boolean;
  sideOffset?: number;
  open?: boolean;
  zIndex?: number;
}) => {
  let ref = useRef<HTMLDivElement>(null);
  let [internalOpen, setInternalOpen] = useState(false);
  let open = openProp ?? internalOpen;

  useEffect(() => {
    if (!highlighted || !results.find((result) => result === highlighted))
      setHighlighted(results[0]);
    if (results.length === 1) {
      setHighlighted(results[0]);
    }
  }, [results, setHighlighted, highlighted]);

  useEffect(() => {
    let listener = async (e: KeyboardEvent) => {
      let reverseDir = ref.current?.dataset.side === "top";
      let currentHighlightIndex = results.findIndex(
        (result) => highlighted && result === highlighted,
      );

      if (reverseDir ? e.key === "ArrowUp" : e.key === "ArrowDown") {
        setHighlighted(
          results[
            currentHighlightIndex === results.length - 1 ||
            currentHighlightIndex === undefined
              ? 0
              : currentHighlightIndex + 1
          ],
        );
        return;
      }
      if (reverseDir ? e.key === "ArrowDown" : e.key === "ArrowUp") {
        setHighlighted(
          results[
            currentHighlightIndex === 0 ||
            currentHighlightIndex === undefined ||
            currentHighlightIndex === -1
              ? results.length - 1
              : currentHighlightIndex - 1
          ],
        );
        return;
      }

      // on enter, select the highlighted item
      if (e.key === "Enter") {
        e.preventDefault();
        onSelect?.();
        setInternalOpen(false);
      }
    };

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [highlighted, setHighlighted, results]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(newOpen) => {
        setInternalOpen(newOpen);
        onOpenChange?.(newOpen);
      }}
    >
      <Popover.Trigger asChild className={`${triggerClassName}`}>
        <div>{trigger}</div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={sideOffset ? sideOffset : 16}
          collisionPadding={16}
          ref={ref}
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={zIndex !== undefined ? { zIndex } : undefined}
          className={`
            commandMenuContent group/cmd-menu
            z-20 w-[264px]
            flex data-[side=top]:items-end items-start
            ${className}
            `}
        >
          <NestedCardThemeProvider>
            <div
              className={`commandMenuResults w-full max-h-(--radix-popover-content-available-height) overflow-auto no-scrollbar flex flex-col group-data-[side=top]/cmd-menu:flex-col-reverse bg-bg-page gap-0.5 border border-border rounded-md shadow-md `}
            >
              {showSearch && setSearchValue ? (
                <Input
                  autoFocus
                  placeholder="search…"
                  className={`px-3 pb-1 pt-1  text-primary focus-within:outline-none! focus:outline-none! focus-visible:outline-none! appearance-none bg-bg-page border-border-light border-b group-data-[side=top]/cmd-menu:border-t group-data-[side=top]/cmd-menu:border-b-0
                  sticky group-data-[side=top]/cmd-menu:bottom-0 top-0`}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : null}
              <div className="space h-1 w-full bg-transparent" />
              {children}
              <div className="space h-1 w-full bg-transparent" />
            </div>
          </NestedCardThemeProvider>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export const ComboboxResult = (props: {
  result: string;
  children: React.ReactNode;
  onSelect: () => void;
  highlighted: string | undefined;
  setHighlighted: (state: string | undefined) => void;
  className?: string;
}) => {
  let isHighlighted = props.highlighted === props.result;

  return (
    <button
      className={`comboboxResult menuItem  text-secondary font-normal! py-0.5! mx-1 ${props.className} ${isHighlighted && "bg-[var(--accent-light)]!"}`}
      onMouseOver={() => {
        props.setHighlighted(props.result);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onSelect();
      }}
    >
      <div className="truncate flex items-center">{props.children}</div>
    </button>
  );
};
