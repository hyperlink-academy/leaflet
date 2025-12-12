"use client";

import { SpeedyLink } from "components/SpeedyLink";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState, useEffect } from "react";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

export type ProfileTabType = "posts" | "comments" | "subscriptions";

export const ProfileTabs = (props: { didOrHandle: string }) => {
  const cardBorderHidden = useCardBorderHidden();
  const segment = useSelectedLayoutSegment();
  const currentTab = (segment || "posts") as ProfileTabType;
  const [scrollPosWithinTabContent, setScrollPosWithinTabContent] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    let headerHeight =
      document.getElementById("profile-header")?.clientHeight || 0;
    setHeaderHeight(headerHeight);

    const profileContent = document.getElementById("profile-content");
    const handleScroll = () => {
      if (profileContent) {
        setScrollPosWithinTabContent(profileContent.scrollTop - headerHeight);
      }
    };

    if (profileContent) {
      profileContent.addEventListener("scroll", handleScroll);
      return () => profileContent.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const baseUrl = `/p/${props.didOrHandle}`;
  const bgColor = !cardBorderHidden ? "var(--bg-leaflet)" : "var(--bg-page)";
  console.log(scrollPosWithinTabContent);

  return (
    <div className="flex flex-col w-full sticky top-3 sm:top-4 z-10 sm:px-4 px-3">
      <div
        style={
          scrollPosWithinTabContent < 0
            ? { paddingLeft: "0", paddingRight: "0" }
            : scrollPosWithinTabContent > 0 && scrollPosWithinTabContent < 20
              ? {
                  paddingLeft: `calc(${scrollPosWithinTabContent / 20} * 12px )`,
                  paddingRight: `calc(${scrollPosWithinTabContent / 20} * 12px )`,
                }
              : { paddingLeft: "12px", paddingRight: "12px" }
        }
      >
        <div
          className={`
            border rounded-lg
            ${scrollPosWithinTabContent > 20 ? "border-border-light" : "border-transparent"}
            py-1
            w-full `}
          style={
            scrollPosWithinTabContent < 20
              ? {
                  backgroundColor: !cardBorderHidden
                    ? `rgba(${bgColor}, ${scrollPosWithinTabContent / 60 + 0.75})`
                    : `rgba(${bgColor}, ${scrollPosWithinTabContent / 20})`,
                  paddingLeft: !cardBorderHidden
                    ? "4px"
                    : `calc(${scrollPosWithinTabContent / 20} * 4px)`,
                  paddingRight: !cardBorderHidden
                    ? "4px"
                    : `calc(${scrollPosWithinTabContent / 20} * 4px)`,
                }
              : {
                  backgroundColor: `rgb(${bgColor})`,
                  paddingLeft: "4px",
                  paddingRight: "4px",
                }
          }
        >
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <TabLink
                href={baseUrl}
                name="Posts"
                selected={currentTab === "posts"}
              />
              <TabLink
                href={`${baseUrl}/comments`}
                name="Comments"
                selected={currentTab === "comments"}
              />
            </div>
            <TabLink
              href={`${baseUrl}/subscriptions`}
              name="Subscriptions"
              selected={currentTab === "subscriptions"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TabLink = (props: { href: string; name: string; selected: boolean }) => {
  return (
    <SpeedyLink
      href={props.href}
      className={`pubTabs px-1 py-0 flex gap-1 items-center rounded-md hover:cursor-pointer hover:no-underline! ${
        props.selected
          ? "text-accent-2 bg-accent-1 font-bold -mb-px"
          : "text-tertiary"
      }`}
    >
      {props.name}
    </SpeedyLink>
  );
};
