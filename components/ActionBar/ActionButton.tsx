"use client";

import { useContext, useEffect } from "react";
import { SidebarContext } from "./Sidebar";
import React, { forwardRef, type JSX } from "react";
import { PopoverOpenContext } from "components/Popover";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;

export const ActionButton = (
  props: ButtonProps & {
    id?: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    primary?: boolean;
    secondary?: boolean;
    nav?: boolean;
    className?: string;
  },
) => {
  let { id, icon, label, primary, secondary, nav, ...buttonProps } = props;
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
  return (
    <button
      {...buttonProps}
      className={`
      actionButton relative font-bold
      rounded-md border
      flex gap-2 items-center sm:justify-start justify-center
      p-1 sm:mx-0
      ${
        primary
          ? "w-full bg-accent-1 border-accent-1 text-accent-2 transparent-outline sm:hover:outline-accent-contrast focus:outline-accent-1 outline-offset-1 mx-1 first:ml-0"
          : secondary
            ? "sm:w-full w-max bg-bg-page border-accent-contrast text-accent-contrast transparent-outline focus:outline-accent-contrast sm:hover:outline-accent-contrast outline-offset-1 mx-1 first:ml-0"
            : nav
              ? "w-full border-transparent text-secondary sm:hover:border-border !justify-start"
              : "sm:w-full border-transparent text-accent-contrast sm:hover:border-accent-contrast"
      }
      ${props.className}
      `}
    >
      <div className="shrink-0">{icon}</div>
      <div
        className={`truncate pr-1 w-max ${sidebar.open ? "block" : primary || secondary || nav ? "sm:hidden block" : "hidden"}`}
      >
        {label}
      </div>
    </button>
  );
};
