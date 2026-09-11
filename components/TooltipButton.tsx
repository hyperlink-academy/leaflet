"use client";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { useReplicache } from "src/replicache";
import { NestedCardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { PopoverArrow } from "components/Icons/PopoverArrow";

export const TooltipButton = (props: {
  onMouseDown?: (e: React.MouseEvent) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  tooltipContent: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left" | undefined;
  open?: boolean;
  delayDuration?: number;
}) => {
  let { undoManager } = useReplicache();
  return (
    // toolbar button does not control the highlight theme setter
    // if toolbar button is updated, be sure to update there as well
    <RadixTooltip.TooltipProvider
      delayDuration={props.delayDuration ? props.delayDuration : 400}
    >
      <RadixTooltip.Root open={props.open}>
        <RadixTooltip.Trigger
          disabled={props.disabled}
          className={props.className}
          onMouseDown={async (e) => {
            e.preventDefault();
            await undoManager.withUndoGroup(async () => {
              props.onMouseDown && (await props.onMouseDown(e));
            });
          }}
        >
          {props.children}
        </RadixTooltip.Trigger>

        <RadixTooltip.Portal>
          <NestedCardThemeProvider>
            <RadixTooltip.Content
              side={props.side ? props.side : undefined}
              sideOffset={6}
              alignOffset={12}
              className="portalStyles z-10  rounded-md py-1 px-[6px] font-bold text-secondary text-sm"
              style={{
                backgroundColor:
                  "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-page)) 85%)",
              }}
            >
              {props.tooltipContent}
              <RadixTooltip.Arrow
                asChild
                width={16}
                height={8}
                viewBox="0 0 16 8"
              >
                <PopoverArrow
                  arrowFill={
                    "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-page)) 85%)"
                  }
                  arrowStroke="transparent"
                />
              </RadixTooltip.Arrow>
            </RadixTooltip.Content>
          </NestedCardThemeProvider>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.TooltipProvider>
  );
};
