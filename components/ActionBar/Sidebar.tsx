"use client";
import { Media } from "components/Media";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { createContext, useState } from "react";
import { create } from "zustand";

export const SidebarContext = createContext({
  open: false,
  setChildForceOpen: (b: boolean) => {},
});

export const useSidebarStore = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function Sidebar(props: {
  children?: React.ReactNode;
  alwaysOpen?: boolean;
  mobile?: boolean;
  className?: string;
}) {
  let [sidebarExpanded, setSidebarExpanded] = useState(false);
  let [childForceOpen, setChildForceOpen] = useState(false);
  let open = sidebarExpanded || childForceOpen;
  let cardBorderHidden = useCardBorderHidden();
  return (
    <Media
      mobile={props.mobile ?? false}
      className="pwa-padding pwa-padding-bottom sm:h-full h-[calc(100dvh-16px)]"
    >
      <SidebarContext
        value={{
          open: props.alwaysOpen ? true : open,
          setChildForceOpen,
        }}
      >
        <div
          className={`
          actionSidebar
          ${props.alwaysOpen ? "h-fill" : "h-fit"}
          ${
            !props.alwaysOpen
              ? ` w-max hover:w-48 absolute top-0 left-0 z-10 opaque-container`
              : `my-6 w-56 ${cardBorderHidden ? "light-container" : "frosted-container"}`
          }
          p-[6px]
          flex flex-col gap-0.5 justify-start border
          rounded-md
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
