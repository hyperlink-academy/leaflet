import React, { forwardRef, type JSX } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

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
        border border-accent-1 rounded-md disabled:border-border-light disabled:outline-none! disabled:cursor-not-allowed!
        outline-2 outline-transparent outline-offset-1 focus:outline-accent-1 hover:outline-accent-1
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
        outline-2 outline-transparent focus:outline-accent-contrast hover:outline-accent-contrast outline-offset-1 disabled:outline-none! disabled:cursor-not-allowed!
        text-base font-bold text-accent-contrast disabled:text-border disabled:hover:text-border disabled:border-border-light
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
         outline-2 outline-transparent focus:outline-[var(--accent-light)] hover:outline-[var(--accent-light)] outline-offset-1  disabled:outline-none! disabled:cursor-not-allowed!
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
