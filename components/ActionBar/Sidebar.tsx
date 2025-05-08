import { ButtonPrimary } from "components/Buttons";
import { Media } from "components/Media";
import { createContext, useState } from "react";

export const SidebarOpenContext = createContext(false);

export function Sidebar(props: { children?: React.ReactNode }) {
  let [sidebarExpanded, setSidebarExpanded] = useState(false);
  return (
    <Media mobile={false}>
      <SidebarOpenContext value={sidebarExpanded}>
        <div
          className={`
          sidebar
          absolute top-0 left-0 z-10
          h-fit w-max p-[6px]
          flex flex-col gap-2 justify-start border
          rounded-md  bg-bg-page ${sidebarExpanded ? "border-border-light" : "bg-opacity-50 border-bg-page"}
          `}
          onMouseOver={() => {
            setSidebarExpanded(true);
          }}
          onMouseLeave={() => {
            setSidebarExpanded(false);
          }}
        >
          {props.children}
        </div>
      </SidebarOpenContext>
    </Media>
  );
}
