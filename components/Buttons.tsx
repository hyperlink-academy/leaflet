import React, { forwardRef } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { theme } from "tailwind.config";
import { PopoverArrow } from "./Icons";
import {
  CardThemeProvider,
  NestedCardThemeProvider,
} from "./ThemeManager/ThemeProvider";

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
        bg-accent-1  outline-transparent border border-accent-1
        rounded-md text-base font-bold text-accent-2
        flex gap-2 items-center justify-center shrink-0
        transparent-outline hover:outline-accent-1 outline-offset-1
        disabled:bg-border-light disabled:border-border-light disabled:text-border disabled:hover:text-border
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
  {
    fullWidth?: boolean;
    children: React.ReactNode;
    compact?: boolean;
  } & ButtonProps
>((props, ref) => {
  return (
    <button
      {...props}
      ref={ref}
      className={`m-0 h-max ${props.fullWidth ? "w-full" : "w-max"}  ${props.compact ? "py-0 px-1" : "px-2 py-0.5 "}
  bg-bg-page outline-transparent
  rounded-md text-base font-bold text-accent-contrast
  flex gap-2 items-center justify-center shrink-0
  transparent-outline hover:outline-accent-contrast outline-offset-1
  border border-accent-contrast
  disabled:bg-border-light disabled:text-border disabled:hover:text-border
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
    children: React.ReactNode;
    compact?: boolean;
  } & ButtonProps
>((props, ref) => {
  return (
    <button
      {...props}
      ref={ref}
      className={`m-0 h-max ${props.fullWidth ? "w-full" : "w-max"}  ${props.compact ? "px-0" : "px-1"}
  bg-transparent text-base font-bold text-accent-contrast
  flex gap-2 items-center justify-center shrink-0
  hover:underline disabled:text-border
  ${props.className}
`}
    >
      {props.children}
    </button>
  );
});
ButtonTertiary.displayName = "ButtonTertiary";

export const HoverButton = (props: {
  id?: string;
  icon: React.ReactNode;
  label: string;
  background: string;
  text: string;
  backgroundImage?: React.CSSProperties;
  noLabelOnMobile?: boolean;
}) => {
  return (
    <div className="sm:w-8 sm:h-8 relative ">
      <div
        id={props.id}
        className={`
          z-10 group/hover-button
          w-max h-max rounded-full p-1 flex gap-2
          sm:absolute top-0 left-0
          place-items-center justify-center
          ${props.background} ${props.text}`}
        style={props.backgroundImage}
      >
        {props.icon}
        <div
          className={`font-bold pr-[6px] group-hover/hover-button:block ${props.noLabelOnMobile ? "hidden" : "sm:hidden"}`}
        >
          {props.label}
        </div>
      </div>
    </div>
  );
};

export const TooltipButton = (props: {
  onMouseDown?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left" | undefined;
  open?: boolean;
}) => {
  return (
    // toolbar button does not control the highlight theme setter
    // if toolbar button is updated, be sure to update there as well
    <RadixTooltip.TooltipProvider>
      <RadixTooltip.Root open={props.open}>
        <RadixTooltip.Trigger
          disabled={props.disabled}
          className={props.className}
          onMouseDown={(e) => {
            e.preventDefault();
            props.onMouseDown && props.onMouseDown(e);
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
              {props.content}
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
