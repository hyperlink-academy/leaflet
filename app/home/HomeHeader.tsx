"use client";
import { HomeSmall } from "components/Icons/HomeSmall";
import { useEffect, useState } from "react";

export const HomeHeader = () => {
  // when the thing is scrolled into the content area, add the border and bg-bg-page it rather than being transparent

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
    console.log(scrollPos);
  }, []);

  console.log(scrollPos);

  return (
    <div
      className={`
      homeHeaderWrapper
      sticky top-0 z-10
      pt-7 pl-6 pr-4 w-full bg-transparent
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
        homeHeaderContent
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
          <div className="font-bold text-secondary flex gap-2 items-center">
            <HomeSmall /> Home
          </div>
          <div className="flex gap-2 text-tertiary text-sm">
            <div>Grid</div>
            <div>List</div>
            <div>Filter</div>
            <div>Sort</div>
          </div>
        </div>
      </div>
    </div>
  );
};
