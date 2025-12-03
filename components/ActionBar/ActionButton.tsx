"use client";

import { useContext, useEffect } from "react";
import { SidebarContext } from "./Sidebar";
import React, { forwardRef, type JSX } from "react";
import { PopoverOpenContext } from "components/Popover";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;

export const ActionButton = (
  _props: ButtonProps & {
    id?: string;
    icon: React.ReactNode;
    label?: React.ReactNode;
    primary?: boolean;
    secondary?: boolean;
    nav?: boolean;
    className?: string;
    subtext?: string;
    labelOnMobile?: boolean;
    z?: boolean;
  },
) => {
  let {
    id,
    icon,
    label,
    primary,
    secondary,
    nav,
    labelOnMobile,
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
      className={`
      actionButton relative font-bold
      rounded-md border
      flex gap-2 items-start sm:justify-start justify-center
      p-1 sm:mx-0
      ${showLabelOnMobile && !secondary ? "w-full" : "sm:w-full w-max"}
      ${
        primary
          ? "bg-accent-1 border-accent-1 text-accent-2 transparent-outline sm:hover:outline-accent-contrast focus:outline-accent-1 outline-offset-1 mx-1 first:ml-0"
          : secondary
            ? " bg-bg-page border-accent-contrast text-accent-contrast transparent-outline focus:outline-accent-contrast sm:hover:outline-accent-contrast outline-offset-1 mx-1 first:ml-0"
            : nav
              ? "border-transparent text-secondary sm:hover:border-border justify-start!"
              : "border-transparent text-accent-contrast sm:hover:border-accent-contrast"
      }
      ${className}
      `}
    >
      <div className="shrink-0">{icon}</div>
      {label && (
        <div
          className={`flex flex-col pr-1 leading-snug max-w-full min-w-0  ${sidebar.open ? "block" : showLabelOnMobile ? "sm:hidden block" : "hidden"}`}
        >
          <div className="truncate text-left pt-[1px]">{label}</div>
          {subtext && (
            <div className="text-xs text-tertiary font-normal text-left">
              {subtext}
            </div>
          )}
        </div>
      )}
    </button>
  );
};
