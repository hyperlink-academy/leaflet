"use client";
import { useState, useEffect } from "react";

export const Header = (props: {
  children: React.ReactNode;
  cardBorderHidden: boolean;
}) => {
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

  let headerBGColor = props.cardBorderHidden
    ? "var(--bg-leaflet)"
    : "var(--bg-page)";

  return (
    <div
      className={`
      headerWrapper
      sticky top-0 z-10
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
                  backgroundColor: `rgba(${headerBGColor}, ${scrollPos / 60 + 0.75})`,
                  paddingLeft: props.cardBorderHidden
                    ? `calc(${scrollPos / 20}*8px)`
                    : "8px",
                  paddingRight: props.cardBorderHidden
                    ? `calc(${scrollPos / 20}*8px)`
                    : "8px",
                }
              : {
                  backgroundColor: `rgb(${headerBGColor})`,
                  paddingLeft: "8px",
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
