import * as RadixTooltip from "@radix-ui/react-tooltip";
import { PopoverArrow } from "./Icons/PopoverArrow";
import { theme } from "tailwind.config";
import { NestedCardThemeProvider } from "./ThemeManager/ThemeProvider";

export const Tooltip = (props: {
  trigger: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  background?: string;
  border?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
  arrowFill?: string;
}) => {
  return (
    <RadixTooltip.Provider
      delayDuration={props.delayDuration ? props.delayDuration : 600}
      skipDelayDuration={
        props.skipDelayDuration ? props.skipDelayDuration : 300
      }
    >
      <RadixTooltip.Root>
        <RadixTooltip.Trigger disabled={props.disabled} asChild={props.asChild}>
          {props.trigger}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <NestedCardThemeProvider>
            <RadixTooltip.Content
              className={`
          z-20 bg-bg-page
          px-3 py-2
          max-w-[var(--radix-popover-content-available-width)]
          max-h-[var(--radix-popover-content-available-height)]
          border border-border rounded-md shadow-md
          overflow-y-scroll no-scrollbar
          ${props.className}
        `}
              side={props.side}
              align={props.align ? props.align : "center"}
              sideOffset={4}
              collisionPadding={16}
            >
              {props.children}
              <RadixTooltip.Arrow
                asChild
                width={16}
                height={8}
                viewBox="0 0 16 8"
              >
                <PopoverArrow
                  arrowFill={theme.colors["border"]}
                  arrowStroke="transparent"
                />
              </RadixTooltip.Arrow>
            </RadixTooltip.Content>
          </NestedCardThemeProvider>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
};
