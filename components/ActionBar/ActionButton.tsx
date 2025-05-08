import { useContext } from "react";
import { SidebarOpenContext } from "./Sidebar";

export const ActionButton = (props: {
  id?: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  secondary?: boolean;
  expanded?: boolean;

  background: string;
  text: string;
  backgroundImage?: React.CSSProperties;
  noLabelOnMobile?: boolean;
}) => {
  let sidebarExpanded = useContext(SidebarOpenContext);
  return (
    <div
      className={`
      actionButton relative rounded-md border
      ${sidebarExpanded ? "w-full" : props.primary || props.secondary ? "sm:w-full w-8" : "w-8"}
      ${
        props.primary
          ? "bg-accent-1 border-accent-1 text-accent-2"
          : props.secondary
            ? "bg-accent-2 border-accent-1 text-accent-1"
            : "border-transparent text-accent-1"
      }
      `}
    >
      <div
        id={props.id}
        className={`w-full flex gap-2 place-items-center justify-start font-bold py-1 px-1 `}
      >
        <div className="shrink-0">{props.icon}</div>
        {sidebarExpanded && <div>{props.label}</div>}
      </div>
    </div>
  );
};
