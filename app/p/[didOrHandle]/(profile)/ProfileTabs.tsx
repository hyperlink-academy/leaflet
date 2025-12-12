"use client";

import { SpeedyLink } from "components/SpeedyLink";
import { useSelectedLayoutSegment } from "next/navigation";

export type ProfileTabType = "posts" | "comments" | "subscriptions";

export const ProfileTabs = (props: { didOrHandle: string }) => {
  const segment = useSelectedLayoutSegment();
  const currentTab = (segment || "posts") as ProfileTabType;

  const baseUrl = `/p/${props.didOrHandle}`;

  return (
    <div className="flex flex-col w-full px-3 sm:px-4">
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
      <hr className="border-border-light mt-1" />
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
