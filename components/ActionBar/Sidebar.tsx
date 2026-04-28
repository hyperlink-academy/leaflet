"use client";
import { uv } from "colorjs.io/fn";
import { Media } from "components/Media";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
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
  let cardBorderHidden = useCardBorderHidden();
  return (
    <Media mobile={false}>
      <SidebarContext
        value={{
          open: props.alwaysOpen ? true : open,
          setChildForceOpen,
        }}
      >
        <div
          style={{ height: "-webkit-fill-available" }}
          className={`
          actionSidebar
          ${!props.alwaysOpen ? "absolute top-0 left-0 z-10 w-max" : "w-[192px] max-w-[192px]"}
          p-[6px] my-6
          flex flex-col gap-0.5 justify-start border
          rounded-md ${cardBorderHidden ? "light-container" : "frosted-container"}
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
