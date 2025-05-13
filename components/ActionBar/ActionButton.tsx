"use client";
import { useContext, useEffect } from "react";
import { SidebarContext } from "./Sidebar";
import React, { forwardRef, type JSX } from "react";
import { PopoverOpenContext } from "components/Popover";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "content">;

export const ActionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    id?: string;
    icon: React.ReactNode;
    label: string;
    primary?: boolean;
    secondary?: boolean;
  }
>((props, ref) => {
  let { id, icon, label, primary, secondary, ...buttonProps } = props;
  let sidebar = useContext(SidebarContext);
  let inOpenPopover = useContext(PopoverOpenContext);
  useEffect(() => {
    if (inOpenPopover) {
      console.log("inOpenPopover");
      sidebar.setChildForceOpen(true);
      return () => {
        sidebar.setChildForceOpen(false);
      };
    }
  }, [sidebar, inOpenPopover]);
  return (
    <button
      {...buttonProps}
      ref={ref}
      id={props.id}
      className={`
      actionButton relative font-bold
      rounded-md border
      flex gap-2 items-center sm:justify-start justify-center
      p-1 sm:mx-0
      ${
        props.primary
          ? "w-full bg-accent-1 border-accent-1 text-accent-2 transparent-outline sm:hover:outline-accent-contrast focus:outline-accent-1 outline-offset-1 mx-1 first:ml-0"
          : props.secondary
            ? "sm:w-full w-max bg-bg-page border-accent-contrast text-accent-contrast transparent-outline focus:outline-accent-contrast sm:hover:outline-accent-contrast outline-offset-1 mx-1 first:ml-0"
            : "sm:w-full w-max border-transparent text-accent-1 sm:hover:border-accent-1"
      }
      `}
    >
      <div className="shrink-0">{props.icon}</div>
      <div
        className={`pr-1 w-max ${sidebar.open ? "block" : props.primary || props.secondary ? "sm:hidden block" : "hidden"}`}
      >
        {props.label}
      </div>
    </button>
  );
});

ActionButton.displayName = "ActionButton";
