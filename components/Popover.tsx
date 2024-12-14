import * as RadixPopover from "@radix-ui/react-popover";
import { PopoverArrow } from "./Icons";
import { theme } from "tailwind.config";
import { NestedCardThemeProvider } from "./ThemeManager/ThemeProvider";

export const Popover = (props: {
  trigger: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  background?: string;
  border?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
}) => {
  return (
    <RadixPopover.Root open={props.open} onOpenChange={props.onOpenChange}>
      <RadixPopover.Trigger disabled={props.disabled} asChild={props.asChild}>
        {props.trigger}
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <NestedCardThemeProvider>
          <RadixPopover.Content
            className={`
              z-20 bg-bg-page
              px-3 py-2
              max-w-[var(--radix-popover-content-available-width)]
              max-h-[var(--radix-popover-content-available-height)]
              border border-border rounded-md shadow-md
              overflow-y-scroll no-scrollbar
              ${props.className}
            `}
            align={props.align ? props.align : "center"}
            sideOffset={4}
            collisionPadding={16}
          >
            {props.children}
            <RadixPopover.Arrow
              asChild
              width={16}
              height={8}
              viewBox="0 0 16 8"
            >
              <PopoverArrow
                arrowFill={
                  props.background ? props.background : theme.colors["bg-page"]
                }
                arrowStroke={
                  props.border ? props.border : theme.colors["border"]
                }
              />
            </RadixPopover.Arrow>
          </RadixPopover.Content>
        </NestedCardThemeProvider>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};
