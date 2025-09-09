"use client";
import { useState, useEffect } from "react";

export const Header = (props: { children: React.ReactNode }) => {
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

  return (
    <div
      className={`
      headerWrapper
      sticky top-0 z-10
      w-full bg-transparent
      `}
    >
      <div
        className="-mx-2"
        style={
          scrollPos < 20
            ? {
                paddingLeft: `calc(${scrollPos / 20}*16px)`,
                paddingRight: `calc(${scrollPos / 20}*16px)`,
              }
            : { paddingLeft: `16px`, paddingRight: `16px` }
        }
      >
        <div
          className={`
            headerContent
            border rounded-lg
            ${scrollPos > 20 ? "border-border-light" : "border-transparent"}
            py-1 px-2
            w-full flex justify-between items-center gap-2`}
          style={
            scrollPos < 20
              ? {
                  backgroundColor: `rgba(var(--bg-leaflet), ${scrollPos / 20})`,
                }
              : { backgroundColor: "rgb(var(--bg-leaflet))" }
          }
        >
          {props.children}
        </div>
      </div>
    </div>
  );
};
