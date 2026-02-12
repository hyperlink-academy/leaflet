"use client";
import * as RadixPopover from "@radix-ui/react-popover";
import { theme } from "tailwind.config";
import { NestedCardThemeProvider } from "../ThemeManager/ThemeProvider";
import { useEffect, useState } from "react";
import { PopoverArrow } from "../Icons/PopoverArrow";
import { PopoverOpenContext } from "./PopoverContext";
export const Popover = (props: {
  trigger: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  background?: string;
  border?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenAutoFocus?: (e: Event) => void;
  asChild?: boolean;
  arrowFill?: string;
  noArrow?: boolean;
}) => {
  let [open, setOpen] = useState(props.open || false);
  useEffect(() => {
    if (props.open !== undefined) setOpen(props.open);
  }, [props.open]);
  return (
    <RadixPopover.Root
      open={props.open}
      onOpenChange={(o) => {
        setOpen(o);
        props.onOpenChange?.(o);
      }}
    >
      <PopoverOpenContext value={open}>
        <RadixPopover.Trigger disabled={props.disabled} asChild={props.asChild}>
          {props.trigger}
        </RadixPopover.Trigger>
        <RadixPopover.Portal>
          <NestedCardThemeProvider>
            <RadixPopover.Content
              className={`
              z-20 relative bg-bg-page
              px-3 py-2 text-primary
              max-w-(--radix-popover-content-available-width)
              max-h-(--radix-popover-content-available-height)
              border border-border rounded-md shadow-md
              overflow-y-scroll
              ${props.className}
            `}
              side={props.side}
              align={props.align ? props.align : "center"}
              sideOffset={props.sideOffset ? props.sideOffset : 4}
              collisionPadding={16}
              onOpenAutoFocus={props.onOpenAutoFocus}
            >
              {props.children}
              {!props.noArrow && (
                <RadixPopover.Arrow
                  asChild
                  width={16}
                  height={8}
                  viewBox="0 0 16 8"
                >
                  <PopoverArrow
                    arrowFill={
                      props.arrowFill
                        ? props.arrowFill
                        : props.background
                          ? props.background
                          : theme.colors["bg-page"]
                    }
                    arrowStroke={
                      props.border ? props.border : theme.colors["border"]
                    }
                  />
                </RadixPopover.Arrow>
              )}
            </RadixPopover.Content>
          </NestedCardThemeProvider>
        </RadixPopover.Portal>
      </PopoverOpenContext>
    </RadixPopover.Root>
  );
};
