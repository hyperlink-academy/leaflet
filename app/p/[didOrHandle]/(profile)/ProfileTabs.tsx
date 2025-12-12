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
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const profileContent = document.querySelector(
      ".overflow-y-scroll",
    ) as HTMLElement;

    const handleScroll = () => {
      if (profileContent) {
        setScrollPos(profileContent.scrollTop);
      }
    };

    if (profileContent) {
      profileContent.addEventListener("scroll", handleScroll);
      return () => profileContent.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const baseUrl = `/p/${props.didOrHandle}`;
  const bgColor = cardBorderHidden ? "var(--bg-leaflet)" : "var(--bg-page)";

  return (
    <div className="flex flex-col w-full sticky top-3 sm:top-4 z-10">
      <div
        style={
          scrollPos < 20
            ? {
                paddingLeft: `calc(${scrollPos / 20} * 12px + 12px)`,
                paddingRight: `calc(${scrollPos / 20} * 12px + 12px)`,
              }
            : { paddingLeft: "24px", paddingRight: "24px" }
        }
      >
        <div
          className={`
            border rounded-lg
            ${scrollPos > 20 ? "border-border-light" : "border-transparent"}
            py-1
            w-full `}
          style={
            scrollPos < 20
              ? {
                  backgroundColor: cardBorderHidden
                    ? `rgba(${bgColor}, ${scrollPos / 60 + 0.75})`
                    : `rgba(${bgColor}, ${scrollPos / 20})`,
                  paddingLeft: cardBorderHidden
                    ? "4px"
                    : `calc(${scrollPos / 20} * 4px)`,
                  paddingRight: cardBorderHidden
                    ? "4px"
                    : `calc(${scrollPos / 20} * 4px)`,
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
