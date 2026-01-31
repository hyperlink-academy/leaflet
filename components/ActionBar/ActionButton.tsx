"use client";

import { useContext, useEffect } from "react";
import { SidebarContext } from "./Sidebar";
import React, { forwardRef, type JSX } from "react";
import { PopoverOpenContext } from "components/Popover/PopoverContext";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;

export const ActionButton = (
  _props: ButtonProps & {
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
      className={`
      actionButton relative font-bold
      rounded-md border
      flex gap-2 items-center justify-start
      p-1 sm:mx-0
      ${showLabelOnMobile && "sm:w-full w-max"}
      ${smallOnMobile && "sm:text-base text-sm py-0 sm:py-1 sm:h-fit h-6"}
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
      style={nav ? { width: "-webkit-fill-available" } : {}}
    >
      <div className="shrink-0 flex flex-row gap-0.5">{icon}</div>
      <div
        className={`flex flex-col ${subtext && "leading-snug"} max-w-full min-w-0 mr-1  ${sidebar.open ? "block" : showLabelOnMobile ? "sm:hidden block" : "hidden"}`}
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
};

// ok currently in the middle of making the actions on home, looseleaf, and pub appear at the top by the page title 
// i then need to find a good place for the publication list in the footer 
// but first i really need to refactor action button
// 1) make a primary variant
// 2) make a secondary variant 
// 