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
      <div className="px-3 sm:px-4 flex flex-col">
        <h3 className="pt-2 leading-tight">
          {profileRecord.displayName
            ? profileRecord.displayName
            : `@${props.profile.handle}`}
        </h3>
        {profileRecord.displayName && (
          <div className="text-tertiary text-sm pb-1 italic">
            @{props.profile.handle}
          </div>
        )}
        <div className="text-secondary">{profileRecord.description}</div>
        <div className="flex flex-row gap-2 mx-auto my-3">
          {props.publications.map((p) => (
            <PublicationCard
              record={p.record as PubLeafletPublication.Record}
              uri={p.uri}
            />
          ))}
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
