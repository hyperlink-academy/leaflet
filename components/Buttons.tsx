import React, { forwardRef, type JSX } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { theme } from "tailwind.config";

import {
  CardThemeProvider,
  NestedCardThemeProvider,
} from "./ThemeManager/ThemeProvider";
import { useReplicache } from "src/replicache";
import { PopoverArrow } from "./Icons/PopoverArrow";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;

export const ButtonPrimary = forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    fullWidth?: boolean;
    fullWidthOnMobile?: boolean;
    children: React.ReactNode;
    compact?: boolean;
  }
>((props, ref) => {
  let {
    className,
    fullWidth,
    fullWidthOnMobile,
    compact,
    children,
    ...buttonProps
  } = props;
  return (
    <button
      {...buttonProps}
      ref={ref}
      className={`
        m-0 h-max
        ${fullWidth ? "w-full" : fullWidthOnMobile ? "w-full sm:w-max" : "w-max"}
        ${compact ? "py-0 px-1" : "px-2 py-0.5 "}
        bg-accent-1 disabled:bg-border-light
        border border-accent-1 rounded-md disabled:border-border-light
        outline outline-transparent outline-offset-1 focus:outline-accent-1 hover:outline-accent-1
        text-base font-bold text-accent-2 disabled:text-border disabled:hover:text-border
        flex gap-2 items-center justify-center shrink-0
        ${className}
      `}
    >
      {children}
    </button>
  );
});
ButtonPrimary.displayName = "ButtonPrimary";

export const ButtonSecondary = forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    fullWidth?: boolean;
    fullWidthOnMobile?: boolean;
    children: React.ReactNode;
    compact?: boolean;
  }
>((props, ref) => {
  let {
    className,
    fullWidth,
    fullWidthOnMobile,
    compact,
    children,
    ...buttonProps
  } = props;
  return (
    <button
      {...buttonProps}
      ref={ref}
      className={`
        m-0 h-max
        ${fullWidth ? "w-full" : fullWidthOnMobile ? "w-full sm:w-max" : "w-max"}
        ${compact ? "py-0 px-1" : "px-2 py-0.5 "}
        bg-bg-page disabled:bg-border-light
        border border-accent-contrast rounded-md
        outline outline-transparent focus:outline-accent-contrast hover:outline-accent-contrast outline-offset-1
        text-base font-bold text-accent-contrast disabled:text-border disabled:hover:text-border
        flex gap-2 items-center justify-center shrink-0
        ${props.className}
        `}
    >
      {props.children}
    </button>
  );
});
ButtonSecondary.displayName = "ButtonSecondary";

export const ButtonTertiary = forwardRef<
  HTMLButtonElement,
  {
    fullWidth?: boolean;
    fullWidthOnMobile?: boolean;
    children: React.ReactNode;
    compact?: boolean;
  } & ButtonProps
>((props, ref) => {
  let {
    className,
    fullWidth,
    fullWidthOnMobile,
    compact,
    children,
    ...buttonProps
  } = props;
  return (
    <button
      {...buttonProps}
      ref={ref}
      className={`
        m-0 h-max
        ${fullWidth ? "w-full" : fullWidthOnMobile ? "w-full sm:w-max" : "w-max"}
        ${compact ? "py-0 px-1" : "px-2 py-0.5 "}
         bg-transparent hover:bg-[var(--accent-light)]
         border border-transparent rounded-md hover:border-[var(--accent-light)]
         outline outline-transparent focus:outline-[var(--accent-light)] hover:outline-[var(--accent-light)] outline-offset-1
         text-base font-bold text-accent-contrast disabled:text-border
         flex gap-2 items-center justify-center shrink-0
         ${props.className}
         `}
    >
      {children}
    </button>
  );
});
ButtonTertiary.displayName = "ButtonTertiary";

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
            undoManager.startGroup();
            props.onMouseDown && (await props.onMouseDown(e));
            undoManager.endGroup();
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
              className="z-10 bg-border rounded-md py-1 px-[6px] font-bold text-secondary text-sm"
            >
              {props.tooltipContent}
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
    </RadixTooltip.TooltipProvider>
  );
};
