import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";
import { HydratedSubscribeNotification } from "src/notifications";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AppBskyActorProfile, PubLeafletPublication } from "lexicons/api";

export const FollowNotification = (props: HydratedSubscribeNotification) => {
  const profileRecord = props.subscriptionData?.identities?.bsky_profiles
    ?.record as AppBskyActorProfile.Record;
  const displayName =
    profileRecord?.displayName ||
    props.subscriptionData?.identities?.bsky_profiles?.handle ||
    "Someone";
  const pubRecord = props.subscriptionData?.publications
    ?.record as PubLeafletPublication.Record;
  const avatarSrc =
    profileRecord?.avatar?.ref &&
    blobRefToSrc(
      profileRecord.avatar.ref,
      props.subscriptionData?.identity || "",
    );

  return (
    <Notification
      timestamp={props.created_at}
      href={`https://${pubRecord?.base_path}`}
      icon={<Avatar src={avatarSrc} displayName={displayName} tiny />}
      actionText={
        <>
          {displayName} subscribed to {pubRecord?.name}!
        </>
      }
    />
  );
};
