import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";
import { HydratedSubscribeNotification } from "src/notifications";

export const FollowNotification = (props: HydratedSubscribeNotification) => {
  const profile = props.subscriptionData?.profile;
  const displayName =
    profile?.displayName || profile?.handle || "Someone";
  const pubRecord = props.normalizedPublication;
  const avatarSrc = profile?.avatar ?? undefined;

  return (
    <Notification
      timestamp={props.created_at}
      href={pubRecord ? pubRecord.url : "#"}
      icon={<Avatar src={avatarSrc} displayName={displayName} size="tiny" />}
      actionText={
        <>
          {displayName} subscribed to {pubRecord?.name}!
        </>
      }
    />
  );
};
