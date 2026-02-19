import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { NestedCardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { create } from "zustand";

export const useComboboxState = create(() => ({
  open: false,
}));

export const Combobox = ({
  results,
  onSelect,
  children,
  onOpenChange,
  highlighted,
  setHighlighted,
  trigger,
  triggerClassName,
  sideOffset,
}: {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  results: string[];
  onSelect?: () => void;
  onOpenChange?: (open: boolean) => void;
  highlighted: string | undefined;
  setHighlighted: (h: string | undefined) => void;
  sideOffset?: number;
}) => {
  let ref = useRef<HTMLDivElement>(null);

  let open = useComboboxState((s) => s.open);

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
        onSelect?.();
        useComboboxState.setState({
          open: false,
        });
      }
    };

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [highlighted, setHighlighted, results]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(newOpen) => {
        useComboboxState.setState({
          open: newOpen,
        });
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
          className={`
            commandMenuContent group/cmd-menu
            z-20 w-[264px]
            flex data-[side=top]:items-end items-start
            `}
        >
          <NestedCardThemeProvider>
            <div className="commandMenuResults w-full max-h-(--radix-popover-content-available-height) overflow-auto flex flex-col group-data-[side=top]/cmd-menu:flex-col-reverse bg-bg-page py-1 gap-0.5 border border-border rounded-md shadow-md">
              {children}
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
        useComboboxState.setState({
          open: false,
        });
      }}
    >
      <div className="truncate">{props.children}</div>
    </button>
  );
};
