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
}) => {
  return (
    <RadixPopover.Root open={props.open}>
      <RadixPopover.Trigger disabled={props.disabled}>
        {props.trigger}
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <NestedCardThemeProvider>
          <RadixPopover.Content
            className={`z-20 bg-bg-page border border-border rounded-md px-3 py-2 max-h-[var(--radix-popover-content-available-height)] overflow-y-scroll no-scrollbar shadow-md ${props.className}`}
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
