"use client";
import { uv } from "colorjs.io/fn";
import { Media } from "components/Media";
import { createContext, useState } from "react";

export const SidebarContext = createContext({
  open: false,
  setChildForceOpen: (b: boolean) => {},
});

export function Sidebar(props: {
  children?: React.ReactNode;
  alwaysOpen?: boolean;
  className?: string;
}) {
  let [sidebarExpanded, setSidebarExpanded] = useState(false);
  let [childForceOpen, setChildForceOpen] = useState(false);
  let open = sidebarExpanded || childForceOpen;
  return (
    <Media mobile={false}>
      <SidebarContext
        value={{
          open: props.alwaysOpen ? true : open,
          setChildForceOpen,
        }}
      >
        <div
          className={`
          actionSidebar
          ${!props.alwaysOpen && "absolute top-0 left-0 z-10"}
          h-fit w-max p-[6px]
          flex flex-col gap-2 justify-start border
          rounded-md  bg-bg-page ${open && !props.alwaysOpen ? "border-border-light" : "container"}
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
      </SidebarContext>
    </Media>
  );
}
