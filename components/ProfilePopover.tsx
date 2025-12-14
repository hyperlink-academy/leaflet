"use client";
import { Popover } from "./Popover";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { useState } from "react";
import { ProfileHeader } from "app/(home-pages)/p/[didOrHandle]/ProfileHeader";
import { SpeedyLink } from "./SpeedyLink";
import { Tooltip } from "./Tooltip";

export const ProfilePopover = (props: {
  trigger: React.ReactNode;
  didOrHandle: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useSWR(
    isOpen ? ["profile-data", props.didOrHandle] : null,
    async () => {
      const response = await callRPC("get_profile_data", {
        didOrHandle: props.didOrHandle,
      });
      return response.result;
    },
  );

  return (
    <Tooltip
      className="max-w-sm p-0! text-center"
      trigger={props.trigger}
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
          <hr className="border-border" />
          <div className="py-2 text-sm text-tertiary">
            Followed by{" "}
            <button className="hover:underline">celine and 4 others</button>
          </div>
        </div>
      ) : (
        <div className="text-secondary py-2 px-4">Profile not found</div>
      )}
    </Tooltip>
  );
};
