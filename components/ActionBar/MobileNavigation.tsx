"use client";
import { useEffect, useRef, useState } from "react";

import { MediaContents } from "components/Media";
import { Separator } from "components/Layout";
import { MenuSmall } from "components/Icons/MenuSmall";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useSidebarStore } from "./Sidebar";
import { SearchTiny } from "components/Icons/SearchTiny";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

export const MobileNavigation = (props: {
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  pageTitle: string;
}) => {
  let [state, setState] = useState<"search" | "default">("default");
  let [hidden, setHidden] = useState(false);
  let [sticky, setSticky] = useState(false);
  let [scrollPos, setScrollPos] = useState(0);
  let lastScrollY = useRef(0);
  let stickyRef = useRef(false);
  let cardBorderHidden = useCardBorderHidden();

  useEffect(() => {
    const homeContent = document.getElementById("home-content");
    if (!homeContent) return;

    const handleScroll = () => {
      const currentScrollY = homeContent.scrollTop;
      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;
      setScrollPos(currentScrollY);

      if (currentScrollY === 0) {
        stickyRef.current = false;
        setSticky(false);
        setHidden(false);
        return;
      }

      if (delta > 8) {
        if (stickyRef.current) setHidden(true);
      } else if (delta < -1 && currentScrollY > 0) {
        if (!stickyRef.current) {
          stickyRef.current = true;
          setSticky(true);
          setHidden(true);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setHidden(false));
          });
        } else {
          setHidden(false);
        }
      }
    };

    homeContent.addEventListener("scroll", handleScroll, { passive: true });
    return () => homeContent.removeEventListener("scroll", handleScroll);
  }, []);

  let headerBGColor = cardBorderHidden ? "var(--bg-leaflet)" : "var(--bg-page)";

  return (
    <MediaContents
      mobile={true}
      className={`mobilePageHeader z-20 w-full transition-transform duration-200 ${sticky ? "sticky top-0" : ""} ${sticky && hidden ? "-translate-y-[80px] " : ""}`}
    >
      <div
        style={
          sticky && scrollPos < 20
            ? {
                paddingLeft: `calc(${scrollPos / 20}*8px)`,
                paddingRight: `calc(${scrollPos / 20}*8px)`,
              }
            : !sticky
              ? { paddingLeft: 0, paddingRight: 0 }
              : { paddingLeft: "8px", paddingRight: "8px" }
        }
      >
        <div
          className={`mobilePageHeaderContent border rounded-lg border-border-light flex gap-4 justify-between items-center p-1 w-full`}
          style={
            scrollPos < 20
              ? {
                  backgroundColor: !cardBorderHidden
                    ? `rgba(${headerBGColor}, ${scrollPos / 60 + 0.75})`
                    : `rgba(${headerBGColor}, ${scrollPos / 20})`,
                }
              : { backgroundColor: `rgb(${headerBGColor})` }
          }
        >
          {props.controls && state === "search" ? (
            <>
              {props.controls}
              <Separator classname="h-6" />
              <button
                onClick={() => {
                  setState("default");
                }}
              >
                <CloseTiny />
              </button>
            </>
          ) : (
            <>
              <MobileSidebarTrigger pageTitle={props.pageTitle} />
              <div className="flex-1" />
              <button
                onClick={() => {
                  setState("search");
                }}
              >
                <SearchTiny />
              </button>
              <div className="flex flex-row-reverse! gap-1">
                {props.actions}
              </div>
            </>
          )}
        </div>
      </div>
    </MediaContents>
  );
};

const MobileSidebarTrigger = (props: { pageTitle: string }) => {
  let setOpen = useSidebarStore((s) => s.setOpen);
  return (
    <button
      className="flex gap-2 items-center text-secondary font-bold"
      onClick={() => setOpen(true)}
    >
      <MenuSmall />
      {props.pageTitle}
    </button>
  );
};
