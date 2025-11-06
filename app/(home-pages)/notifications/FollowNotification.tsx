import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";

export const DummyFollowNotification = () => {
  const identity = "celine";
  const pubName = "Pub Name Here";
  return (
    <Notification
      icon={<Avatar src={undefined} displayName={identity} tiny />}
      actionText={
        <>
          {identity} followed {pubName}!
        </>
      }
    />
  );
};
