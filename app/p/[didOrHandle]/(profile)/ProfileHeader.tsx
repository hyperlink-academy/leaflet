"use client";
import { Avatar } from "components/Avatar";
import { AppBskyActorProfile, PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import type { ProfileData } from "./layout";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { colorToString } from "components/ThemeManager/useColorAttribute";
import { PubIcon } from "components/ActionBar/Publications";
import { Json } from "supabase/database.types";

export const ProfileHeader = (props: {
  profile: ProfileData;
  publications: { record: Json; uri: string }[];
}) => {
  let profileRecord = props.profile.record as AppBskyActorProfile.Record;

  return (
    <>
      <Avatar
        src={
          profileRecord.avatar?.ref &&
          blobRefToSrc(profileRecord.avatar?.ref, props.profile.did)
        }
        displayName={profileRecord.displayName}
        className="mx-auto -mt-8"
        giant
      />
      <div className="flex flex-col">
        <h3 className=" px-3 sm:px-4 pt-2 leading-tight">
          {profileRecord.displayName
            ? profileRecord.displayName
            : `@${props.profile.handle}`}
        </h3>
        {profileRecord.displayName && (
          <div className="text-tertiary text-sm pb-1 italic px-3 sm:px-4 truncate">
            @{props.profile.handle}
          </div>
        )}
        <div className="text-secondary px-3 sm:px-4 ">
          {profileRecord.description}
        </div>
        <div className=" w-full overflow-x-scroll mt-3 mb-6 ">
          <div className="grid grid-flow-col  auto-cols-[164px] sm:auto-cols-[240px] gap-2 mx-auto w-fit px-3 sm:px-4 ">
            {/*<div className="spacer "/>*/}
            {props.publications.map((p) => (
              <PublicationCard
                record={p.record as PubLeafletPublication.Record}
                uri={p.uri}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const PublicationCard = (props: {
  record: PubLeafletPublication.Record;
  uri: string;
}) => {
  const { record, uri } = props;
  const { bgLeaflet, bgPage, primary } = usePubTheme(record.theme);

  return (
    <a
      href={`https://${record.base_path}`}
      className="border border-border p-2 rounded-lg hover:no-underline! text-primary basis-1/2"
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
        <h4
          className="truncate min-w-0"
          style={{
            color: `rgb(${colorToString(primary, "rgb")})`,
          }}
        >
          {record.name}
        </h4>
      </div>
    </a>
  );
};
