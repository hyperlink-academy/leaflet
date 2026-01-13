"use client";
import { Popover } from "./Popover";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { useRef, useState } from "react";
import { ProfileHeader } from "app/(home-pages)/p/[didOrHandle]/ProfileHeader";
import { SpeedyLink } from "./SpeedyLink";
import { Tooltip } from "./Tooltip";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { BlueskyTiny } from "./Icons/BlueskyTiny";
import { ArrowRightTiny } from "./Icons/ArrowRightTiny";

export const ProfilePopover = (props: {
  trigger: React.ReactNode;
  didOrHandle: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  let [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<null | number>(null);

  const { data, isLoading } = useSWR(
    isHovered ? ["profile-data", props.didOrHandle] : null,
    async () => {
      const response = await callRPC("get_profile_data", {
        didOrHandle: props.didOrHandle,
      });
      return response.result;
    },
  );

  return (
    <Popover
      className="max-w-sm p-0! text-center"
      trigger={
        <div
          className="no-underline"
          onPointerEnter={(e) => {
            if (hoverTimeout.current) {
              window.clearTimeout(hoverTimeout.current);
            }
            hoverTimeout.current = window.setTimeout(async () => {
              setIsHovered(true);
            }, 150);
          }}
          onPointerLeave={() => {
            if (isHovered) return;
            if (hoverTimeout.current) {
              window.clearTimeout(hoverTimeout.current);
              hoverTimeout.current = null;
            }
            setIsHovered(false);
          }}
        >
          {props.trigger}
        </div>
      }
      onOpenChange={setIsOpen}
    >
      {isLoading ? (
        <div className="text-secondary p-4">Loading...</div>
      ) : data ? (
        <div>
          <ProfileHeader
            profile={data.profile}
            publications={data.publications}
            popover
          />

          <ProfileLinks handle={data.profile.handle} />
        </div>
      ) : (
        <div className="text-secondary py-2 px-4">Profile not found</div>
      )}
    </Popover>
  );
};

const ProfileLinks = (props: { handle: string }) => {
  return (
    <div className="w-full flex-col">
      <hr className="border-border-light mt-3" />
      <div className="flex gap-2 justify-between sm:px-4 px-3 py-2">
        <div className="flex gap-2">
          <ProfileLink href={`https://bsky.app/profile/${props.handle}`}>
            <BlueskyTiny />
            Bluesky
          </ProfileLink>
        </div>
        <ProfileLink href={"/"}>
          Full profile <ArrowRightTiny />
        </ProfileLink>
      </div>
    </div>
  );
};

const ProfileLink = (props: { children: React.ReactNode; href: string }) => {
  return (
    <a
      href={props.href}
      className="flex gap-1.5 text-tertiary items-center border border-transparent px-1  rounded-md hover:bg-[var(--accent-light)] hover:border-accent-contrast hover:text-accent-contrast no-underline hover:no-underline"
    >
      {props.children}
    </a>
  );
};
