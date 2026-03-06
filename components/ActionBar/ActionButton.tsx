"use client";

import { useContext, useEffect } from "react";
import { SidebarContext } from "./Sidebar";
import React, { forwardRef, type JSX } from "react";
import { PopoverOpenContext } from "components/Popover/PopoverContext";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;

export const ActionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    id?: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    primary?: boolean;
    secondary?: boolean;
    nav?: boolean;
    className?: string;
    subtext?: string;
    labelOnMobile?: boolean;
    smallOnMobile?: boolean;
    z?: boolean;
  }
>((_props, ref) => {
  let {
    id,
    icon,
    label,
    primary,
    secondary,
    nav,
    labelOnMobile,
    smallOnMobile,
    subtext,
    className,
    ...buttonProps
  } = _props;
  let sidebar = useContext(SidebarContext);
  let inOpenPopover = useContext(PopoverOpenContext);
  useEffect(() => {
    if (inOpenPopover) {
      sidebar.setChildForceOpen(true);
      return () => {
        sidebar.setChildForceOpen(false);
      };
    }
  }, [sidebar, inOpenPopover]);

  let showLabelOnMobile =
    labelOnMobile !== false && (primary || secondary || nav);

  return (
    <button
      {...buttonProps}
      ref={ref}
      className={`
      actionButton relative font-bold
      rounded-md border
      flex gap-2 items-center justify-start
      sm:w-full sm:max-w-full p-1
      w-max
      ${smallOnMobile && "sm:text-base text-sm py-0! sm:py-1! sm:h-fit h-6"}
      ${
        primary
          ? "bg-accent-1 border-accent-1 text-accent-2 transparent-outline sm:hover:outline-accent-contrast focus:outline-accent-1 outline-offset-1 "
          : secondary
            ? " bg-bg-page border-accent-contrast text-accent-contrast transparent-outline focus:outline-accent-contrast sm:hover:outline-accent-contrast outline-offset-1"
            : nav
              ? "border-transparent text-secondary sm:hover:border-border justify-start! max-w-full"
              : "border-transparent text-accent-contrast sm:hover:border-accent-contrast"
      }
      ${className}
      `}
    >
      <div className="shrink-0 flex flex-row gap-0.5">{icon}</div>
      <div
        className={`flex flex-col ${subtext && "leading-snug"}  sm:max-w-full min-w-0 mr-1  ${sidebar.open ? "block" : showLabelOnMobile ? "sm:hidden block" : "hidden"}`}
        style={{ width: "-webkit-fill-available" }}
      >
        <div className="truncate text-left">{label}</div>
        {subtext && (
          <div className="text-xs text-tertiary font-normal text-left">
            {subtext}
          </div>
        )}
      </div>
    </button>
  );
});
ActionButton.displayName = "ActionButton";
