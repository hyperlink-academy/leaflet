import { Avatar } from "components/Avatar";
import { Notification } from "./Notification";

export const DummyFollowNotification = (props: {}) => {
  const identity = "celine";
  const pubName = "Pub Name Here";
  return (
    <Notification
      timestamp={""}
      href="/"
      icon={<Avatar src={undefined} displayName={identity} tiny />}
      actionText={
        <>
          {identity} followed {pubName}!
        </>
      }
    />
  );
};
