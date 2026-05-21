"use client";
import { useEffect, useRef, useState } from "react";

import { MediaContents } from "components/Media";
import { Separator } from "components/Layout";
import { MenuSmall } from "components/Icons/MenuSmall";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useSidebarStore } from "./Sidebar";
import { SearchTiny } from "components/Icons/SearchTiny";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { useIdentityData } from "components/IdentityProvider";

export const MobileNavigation = (props: {
  controls?: React.ReactNode;
  hasSearch?: boolean;
  mobileActions?: React.ReactNode;
  pageTitle: string;
  hiddenOnScroll?: boolean;
}) => {
  let [state, setState] = useState<"search" | "default">("default");
  let [hidden, setHidden] = useState(false);
  let [distFromBottom, setDistFromBottom] = useState(1000);
  let lastScrollY = useRef(0);
  let cardBorderHidden = useCardBorderHidden();
  let hiddenOnScroll = props.hiddenOnScroll;

  useEffect(() => {
    const homeContent = document.getElementById("home-content");
    if (!homeContent) return;

    const computeDist = () =>
      Math.max(
        0,
        homeContent.scrollHeight -
          homeContent.clientHeight -
          homeContent.scrollTop,
      );

    setDistFromBottom(computeDist());

    const handleScroll = () => {
      const currentScrollY = homeContent.scrollTop;
      const dist = computeDist();
      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;
      setDistFromBottom(dist);

      if (!hiddenOnScroll) {
        setHidden(false);
        return;
      }

      if (dist <= 0) {
        setHidden(false);
        return;
      }

      if (delta > 8) {
        setHidden(true);
      } else if (delta < -1) {
        setHidden(false);
      }
    };

    homeContent.addEventListener("scroll", handleScroll, { passive: true });
    return () => homeContent.removeEventListener("scroll", handleScroll);
  }, [hiddenOnScroll]);

  let headerBGColor = cardBorderHidden ? "var(--bg-leaflet)" : "var(--bg-page)";
  let atBottom = distFromBottom < 20;

  return (
    <MediaContents
      mobile={true}
      className={`mobilePageFooter  pwa-padding-x z-20 fixed left-0 bottom-4 right-0 transition-transform duration-200 ${hidden ? "translate-y-[120px]" : ""}`}
      style={{ bottom: "var(--safe-padding-bottom)" }}
    >
      <div
        style={
          atBottom
            ? {
                paddingLeft: `calc(${distFromBottom / 20}*8px + 12px)`,
                paddingRight: `calc(${distFromBottom / 20}*8px + 12px)`,
              }
            : { paddingLeft: "20px", paddingRight: "20px" }
        }
      >
        <div
          className={`mobilePageHeaderContent rounded-lg  text-secondary flex gap-2 border justify-between items-center py-1 w-full ${cardBorderHidden && atBottom ? "border-transparent " : " border-border-light"}`}
          style={
            atBottom
              ? {
                  paddingLeft: cardBorderHidden
                    ? `calc(${distFromBottom / 20}*8px)`
                    : "8px",
                  paddingRight: cardBorderHidden
                    ? `calc(${distFromBottom / 20}*8px)`
                    : "8px",
                  backgroundColor: !cardBorderHidden
                    ? `rgba(${headerBGColor}, ${distFromBottom / 60 + 0.75})`
                    : `rgba(${headerBGColor}, ${distFromBottom / 20})`,
                }
              : {
                  paddingLeft: "8px",
                  paddingRight: "8px",
                  backgroundColor: cardBorderHidden
                    ? "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-page)) 95%)"
                    : `rgb(var(--bg-page))`,
                }
          }
        >
          {state === "default" ? (
            <>
              <MobileSidebarTrigger pageTitle={props.pageTitle} />
              <div className="flex-1" />

              {props.controls && props.hasSearch && (
                <button
                  onClick={() => {
                    setState("search");
                  }}
                >
                  <SearchTiny />
                </button>
              )}
              <div className="flex flex-row-reverse! gap-1">
                {props.mobileActions}
              </div>
            </>
          ) : (
            <>
              {props.controls}
              <Separator classname="h-6!" />
              <button
                className="text-secondary"
                onClick={() => {
                  setState("default");
                }}
              >
                <CloseTiny />
              </button>
            </>
          )}
        </div>
      </div>
    </MediaContents>
  );
};

const MobileSidebarTrigger = (props: { pageTitle: string }) => {
  let setOpen = useSidebarStore((s) => s.setOpen);
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;
  return (
    <button
      className="flex gap-2 items-center text-secondary font-bold"
      onClick={() => setOpen(true)}
    >
      <div className="relative">
        <MenuSmall />
        {unreads ? (
          <div className="absolute left-1 -top-0.5  min-w-4 h-4 px-1 rounded-full bg-accent-1 text-accent-2 border border-bg-page text-[8px] leading-none font-bold flex items-center justify-center -translate-x-1/2">
            {unreads < 100 ? unreads : "∞"}
          </div>
        ) : null}
      </div>
      {props.pageTitle}
    </button>
  );
};
