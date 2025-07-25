import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { theme } from "tailwind.config";
import { NestedCardThemeProvider } from "./ThemeManager/ThemeProvider";
import { PopoverArrow } from "./Icons/PopoverArrow";
import { PopoverOpenContext } from "./Popover";
import { useState } from "react";

export const Separator = (props: { classname?: string }) => {
  return (
    <div className={`min-h-full border-r border-border ${props.classname}`} />
  );
};

export const Menu = (props: {
  open?: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end" | "center" | undefined;
  alignOffset?: number;
  side?: "top" | "bottom" | "right" | "left" | undefined;
  background?: string;
  border?: string;
  className?: string;
  onOpenChange?: (o: boolean) => void;
  asChild?: boolean;
}) => {
  let [open, setOpen] = useState(props.open || false);
  return (
    <DropdownMenu.Root
      onOpenChange={(o) => {
        setOpen(o);
        props.onOpenChange?.(o);
      }}
      open={props.open}
    >
      <PopoverOpenContext value={open}>
        <DropdownMenu.Trigger asChild={props.asChild}>
          {props.trigger}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <NestedCardThemeProvider>
            <DropdownMenu.Content
              side={props.side ? props.side : "bottom"}
              align={props.align ? props.align : "center"}
              alignOffset={props.alignOffset ? props.alignOffset : undefined}
              sideOffset={4}
              collisionPadding={16}
              className={`dropdownMenu z-20 bg-bg-page flex flex-col py-1 gap-0.5 border border-border rounded-md shadow-md ${props.className}`}
            >
              {props.children}
              <DropdownMenu.Arrow
                asChild
                width={16}
                height={8}
                viewBox="0 0 16 8"
              >
                <PopoverArrow
                  arrowFill={
                    props.background
                      ? props.background
                      : theme.colors["bg-page"]
                  }
                  arrowStroke={
                    props.border ? props.border : theme.colors["border"]
                  }
                />
              </DropdownMenu.Arrow>
            </DropdownMenu.Content>
          </NestedCardThemeProvider>
        </DropdownMenu.Portal>
      </PopoverOpenContext>
    </DropdownMenu.Root>
  );
};

export const MenuItem = (props: {
  children?: React.ReactNode;
  className?: string;
  onSelect: (e: Event) => void;
  id?: string;
}) => {
  return (
    <DropdownMenu.Item
      id={props.id}
      onSelect={(event) => {
        props.onSelect(event);
      }}
      className={`
        MenuItem
        font-bold z-10 py-1 px-3
        text-left text-secondary
        flex gap-2
        data-[highlighted]:bg-border-light data-[highlighted]:text-secondary
        hover:bg-border-light hover:text-secondary
        outline-none
        cursor-pointer
        ${props.className}
        `}
    >
      {props.children}
    </DropdownMenu.Item>
  );
};

export const ShortcutKey = (props: { children: React.ReactNode }) => {
  return (
    <span>
      <code className="min-w-6 w-fit text-xs text-primary bg-border-light border border-secondary rounded-md px-0.5  flex justify-center font-bold ">
        {props.children}
      </code>
    </span>
  );
};
