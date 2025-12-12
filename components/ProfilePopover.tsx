"use client";
import { Popover } from "./Popover";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { useState } from "react";
import { ProfileHeader } from "app/(home-pages)/p/[didOrHandle]/ProfileHeader";

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
    <Popover
      className="max-w-sm p-0! text-center"
      trigger={props.trigger}
      onOpenChange={setIsOpen}
    >
      {isLoading ? (
        <div className="text-secondary p-4">Loading...</div>
      ) : data ? (
        <ProfileHeader
          profile={data.profile}
          publications={data.publications}
        />
      ) : (
        <div className="text-secondary p-4">Profile not found</div>
      )}
    </Popover>
  );
};
