import { Notification } from "./Notification";

export const DummyFollowNotification = () => {
  return (
    <Notification
      identity={"celine"}
      action={{
        type: "follow",
        avatar: undefined,
        pubName: "Pub Name Here",
      }}
    />
  );
};
