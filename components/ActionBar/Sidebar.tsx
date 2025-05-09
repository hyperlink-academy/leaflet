import { Media } from "components/Media";
import { createContext, useState } from "react";

export const SidebarOpenContext = createContext(false);

export function Sidebar(props: {
  children?: React.ReactNode;
  alwaysOpen?: boolean;
  className?: string;
}) {
  let [sidebarExpanded, setSidebarExpanded] = useState(false);
  return (
    <Media mobile={false}>
      <SidebarOpenContext value={props.alwaysOpen ? true : sidebarExpanded}>
        <div
          className={`
          actionSidebar
          ${!props.alwaysOpen && "absolute top-0 left-0 z-10"}
          h-fit w-max p-[6px]
          flex flex-col gap-2 justify-start border
          rounded-md  bg-bg-page ${sidebarExpanded && !props.alwaysOpen ? "border-border-light" : "bg-opacity-50 border-bg-page"}
          ${props.className}
          `}
          onMouseOver={() => {
            setSidebarExpanded(true);
          }}
          onMouseLeave={() => {
            !props.alwaysOpen && setSidebarExpanded(false);
          }}
        >
          {props.children}
        </div>
      </SidebarOpenContext>
    </Media>
  );
}
