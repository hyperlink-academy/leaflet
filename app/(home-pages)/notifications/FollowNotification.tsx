import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";

export const DummyFollowNotification = (props: {
  cardBorderHidden: boolean;
}) => {
  const identity = "celine";
  const pubName = "Pub Name Here";
  return (
    <Notification
      href="/"
      icon={<Avatar src={undefined} displayName={identity} tiny />}
      cardBorderHidden={props.cardBorderHidden}
      actionText={
        <>
          {identity} followed {pubName}!
        </>
      }
    />
  );
};
