import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";
import { HydratedNewMemberNotification } from "src/notifications";

export const NewMemberNotification = (props: HydratedNewMemberNotification) => {
  const displayName =
    props.profile?.displayName || props.profile?.handle || "A new member";
  const pubRecord = props.normalizedPublication;

  return (
    <Notification
      timestamp={props.created_at}
      href={pubRecord ? pubRecord.url : "#"}
      icon={<Avatar src={props.profile?.avatar ?? undefined} displayName={displayName} size="tiny" />}
      actionText={
        <>
          {displayName} joined {pubRecord?.name}
          {props.tierName ? ` as ${props.tierName}` : ""}!
        </>
      }
    />
  );
};
