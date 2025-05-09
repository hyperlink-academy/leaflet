import { useContext } from "react";
import { SidebarOpenContext } from "./Sidebar";
import React, { forwardRef, type JSX } from "react";

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

  let sidebarExpanded = useContext(SidebarOpenContext);
  return (
    <button
      {...buttonProps}
      ref={ref}
      id={props.id}
      className={`
      actionButton relative
      rounded-md border
      flex gap-2 items-center font-bold p-1 sm:justify-start justify-center
      ${
        props.primary
          ? "w-full bg-accent-1 border-accent-1 text-accent-2 transparent-outline hover:outline-accent-contrast focus:outline-accent-1 outline-offset-1"
          : props.secondary
            ? "w-full bg-bg-page border-accent-contrast text-accent-contrast transparent-outline focus:outline-accent-contrast hover:outline-accent-contrast outline-offset-1"
            : "sm:w-full w-max border-transparent text-accent-1 hover:border-accent-1 "
      }
      `}
    >
      <div className="shrink-0">{props.icon}</div>
      <div
        className={`pr-1 ${sidebarExpanded ? "block" : props.primary || props.secondary ? "sm:hidden block" : "hidden"}`}
      >
        {props.label}
      </div>
    </button>
  );
});

ActionButton.displayName = "ActionButton";
