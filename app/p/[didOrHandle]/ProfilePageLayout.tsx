"use client";
import { Actions } from "app/(home-pages)/home/Actions/Actions";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { useState } from "react";
import { ProfileTabs, TabContent } from "./ProfileTabs/Tabs";
import { Json } from "supabase/database.types";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { Avatar } from "components/Avatar";
import { AppBskyActorProfile, PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { PubIcon } from "components/ActionBar/Publications";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { colorToString } from "components/ThemeManager/useColorAttribute";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";
import type { Cursor } from "./getProfilePosts";

export const ProfilePageLayout = (props: {
  publications: { record: Json; uri: string }[];
  posts: Post[];
  nextCursor: Cursor | null;
  profile: {
    did: string;
    handle: string | null;
    indexed_at: string;
    record: Json;
  } | null;
}) => {
  if (!props.profile) return null;

  return (
    <DashboardLayout
      id={props.profile.did}
      cardBorderHidden={false}
      defaultTab="home"
      tabs={{
        home: {
          content: (
            <ProfilePageContent
              profile={props.profile}
              publications={props.publications}
              posts={props.posts}
              nextCursor={props.nextCursor}
            />
          ),
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
  publications: { record: Json; uri: string }[];
  posts: Post[];
  nextCursor: Cursor | null;
  profile: {
    did: string;
    handle: string | null;
    indexed_at: string;
    record: Json;
  } | null;
}) => {
  let [tab, setTab] = useState<profileTabsType>("posts");

  let profileRecord = props.profile?.record as AppBskyActorProfile.Record;

  if (!props.profile) return;
  return (
    <div className="h-full">
      <div
        className={`
        max-w-prose mx-auto w-full h-full
        flex flex-col
        border border-border-light rounded-lg
        text-center mt-8`}
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
        <div className=" px-3 sm:px-4 flex flex-col ">
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
        </div>
        <ProfileTabs tab={tab} setTab={setTab} />

        <div className="h-full overflow-y-scroll pt-2 pb-4 px-3 sm:px-4 flex flex-col">
          <TabContent
            tab={tab}
            did={props.profile.did}
            posts={props.posts}
            nextCursor={props.nextCursor}
          />
        </div>
      </div>
    </div>
  );
};

const PubListingCompact = () => {
  return <div></div>;
};

const PublicationCard = (props: {
  record: PubLeafletPublication.Record;
  uri: string;
}) => {
  const { record, uri } = props;
  const { bgLeaflet, bgPage } = usePubTheme(record.theme);

  return (
    <a
      href={`https://${record.base_path}`}
      className="border border-border p-2 rounded-lg hover:no-underline!"
      style={{ backgroundColor: `rgb(${colorToString(bgLeaflet, "rgb")})` }}
    >
      <div
        className="rounded-md p-2 flex flex-row gap-2"
        style={{
          backgroundColor: record.theme?.showPageBackground
            ? `rgb(${colorToString(bgPage, "rgb")})`
            : undefined,
        }}
      >
        <PubIcon record={record} uri={uri} />
        <h4>{record.name}</h4>
      </div>
    </a>
  );
};
