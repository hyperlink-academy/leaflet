import { Notification } from "./Notification";
import { HydratedSubscribeNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AppBskyActorProfile, PubLeafletPublication } from "lexicons/api";
import { PubIcon } from "components/ActionBar/Publications";
import { InvitedContent } from "app/lish/[did]/[publication]/invite-contributor/content";
import { ButtonPrimary } from "components/Buttons";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { AtUri } from "@atproto/api";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";

export const ContributorNotification = (
  props: HydratedSubscribeNotification,
) => {
  const profileRecord = props.subscriptionData?.identities?.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const displayName =
    profileRecord?.displayName ||
    props.subscriptionData?.identities?.bsky_profiles?.handle ||
    "Someone";
  const pubRecord = props.subscriptionData?.publications
    ?.record as PubLeafletPublication.Record;

  return (
    // TODO: GET CORRECT TIMESTAMP
    <Notification
      timestamp={""}
      href={`https://${pubRecord?.base_path}/invite-contributor`}
      icon={
        <PubIcon
          record={pubRecord}
          uri={props.subscriptionData?.publications?.uri}
          small
        />
      }
      actionText={
        <>
          {displayName} invited you to contribute to {pubRecord?.name}!
        </>
      }
      content={
        <PubListing
          record={pubRecord}
          uri={props.subscriptionData?.publications?.uri!}
        />
      }
    />
  );
};

const PubListing = (props: {
  record: PubLeafletPublication.Record;
  uri: string;
}) => {
  let record = props.record;
  let theme = usePubTheme(record);
  let backgroundImage = record?.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(
        record?.theme?.backgroundImage?.image?.ref,
        new AtUri(props.uri).host,
      )
    : null;

  let backgroundImageRepeat = record?.theme?.backgroundImage?.repeat;
  let backgroundImageSize = record?.theme?.backgroundImage?.width || 500;
  if (!record) return null;
  return (
    <BaseThemeProvider {...theme} local>
      <div
        className={`no-underline! flex flex-row gap-2
            bg-bg-leaflet
            border border-border-light rounded-lg
            p-2 selected-outline
            hover:outline-accent-contrast hover:border-accent-contrast
            relative overflow-hidden`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
      >
        <div
          className={`
            p-3 w-full  flex flex-col justify-center text-center border border-border-light rounded-lg  hover:no-underline! no-underline! ${record.theme?.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))]" : ""}`}
        >
          <PubIcon record={record} uri={props.uri} className="mx-auto my-1" />
          <h4 className="leading-tight">{record.name}</h4>
          <div className="text-tertiary text-sm italic">
            {record.description}
          </div>
          <ButtonPrimary compact className="mx-auto mt-2 mb-1 text-sm">
            Accept Invite
          </ButtonPrimary>
        </div>
      </div>
    </BaseThemeProvider>
  );
};
