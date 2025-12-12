"use client";
import { Actions } from "app/(home-pages)/home/Actions/Actions";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { useState } from "react";
import { ProfileTabs, TabContent } from "./ProfileTabs/Tabs";
import { Json } from "supabase/database.types";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { Avatar } from "components/Avatar";
import { AppBskyActorProfile } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

export const ProfilePageLayout = (props: {
  profile: {
    did: string;
    handle: string | null;
    indexed_at: string;
    record: Json;
  } | null;
}) => {
  if (!props.profile) return null;

  let profileRecord = props.profile.record as unknown as ProfileViewDetailed;

  console.log(profileRecord);
  return (
    <DashboardLayout
      id={props.profile.did}
      cardBorderHidden={false}
      defaultTab="home"
      tabs={{
        home: {
          content: <ProfilePageContent profile={props.profile} />,
          controls: null,
        },
      }}
      actions={<Actions />}
      currentPage="home"
    />
  );
};

export type profileTabsType = "posts" | "comments" | "subscriptions";
const ProfilePageContent = (props: {
  profile: {
    did: string;
    handle: string | null;
    indexed_at: string;
    record: Json;
  } | null;
}) => {
  let [tab, setTab] = useState<profileTabsType>("posts");

  let profileRecord = props.profile?.record as AppBskyActorProfile.Record;
  console.log(profileRecord);

  if (!props.profile) return;
  return (
    <div
      className={`
        max-w-prose mx-auto w-full h-full
        flex flex-col
        border border-border-light rounded-lg
        text-center px-3 sm:px-4 mt-8`}
    >
      <Avatar
        src={
          profileRecord.avatar?.ref &&
          blobRefToSrc(profileRecord.avatar?.ref, props.profile.did)
        }
        displayName={profileRecord.displayName}
        className="mx-auto -mt-8"
        giant
      />
      <h3 className="pt-2 leading-tight">
        {profileRecord.displayName
          ? profileRecord.displayName
          : `@${props.profile?.handle}`}
      </h3>
      {profileRecord.displayName && (
        <div className="text-tertiary text-sm pb-1 italic">
          @{props.profile?.handle}
        </div>
      )}
      <div className="text-secondary">{profileRecord.description}</div>
      <div className="flex flex-row gap-2 mx-auto my-3">
        <div>pub 1</div>
        <div>pub 2</div>
      </div>
      <ProfileTabs tab={tab} setTab={setTab} />
      <TabContent tab={tab} />
    </div>
  );
};

const PubListingCompact = () => {
  return <div></div>;
};
