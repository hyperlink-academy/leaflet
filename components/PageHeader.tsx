"use client";
import { useState, useEffect } from "react";
import { useCardBorderHidden } from "./Pages/useCardBorderHidden";

export const Header = (props: { children: React.ReactNode }) => {
  let cardBorderHidden = useCardBorderHidden();
  let [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const homeContent = document.getElementById("home-content");

    const handleScroll = () => {
      if (homeContent) {
        setScrollPos(homeContent.scrollTop);
      }
    };

    if (homeContent) {
      homeContent.addEventListener("scroll", handleScroll);
      return () => homeContent.removeEventListener("scroll", handleScroll);
    }
  }, []);

  let headerBGColor = !cardBorderHidden
    ? "var(--bg-leaflet)"
    : "var(--bg-page)";

  return (
    <div
      className={`
      headerWrapper
      sticky top-0 z-20
      w-full bg-transparent
      `}
    >
      <div
        style={
          scrollPos < 20
            ? {
                paddingLeft: `calc(${scrollPos / 20}*8px)`,
                paddingRight: `calc(${scrollPos / 20}*8px)`,
              }
            : { paddingLeft: `8px`, paddingRight: `8px` }
        }
      >
        <div
          className={`
            headerContent
            border rounded-lg
            ${scrollPos > 20 ? "border-border-light" : "border-transparent"}
            py-1
            w-full flex justify-between items-center gap-4`}
          style={
            scrollPos < 20
              ? {
                  backgroundColor: !cardBorderHidden
                    ? `rgba(${headerBGColor}, ${scrollPos / 60 + 0.75})`
                    : `rgba(${headerBGColor}, ${scrollPos / 20})`,
                  paddingLeft: !cardBorderHidden
                    ? "4px"
                    : `calc(${scrollPos / 20}*4px)`,
                  paddingRight: !cardBorderHidden
                    ? "8px"
                    : `calc(${scrollPos / 20}*8px)`,
                }
              : {
                  backgroundColor: `rgb(${headerBGColor})`,
                  paddingLeft: "4px",
                  paddingRight: "8px",
                }
          }
        >
          {props.children}
        </div>
      </div>
    </div>
  );
};
