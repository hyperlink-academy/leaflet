"use client";

import { HydratedNotification } from "src/notifications";
import { CommentNotification } from "./CommentNotication";
import { useEntity, useReplicache } from "src/replicache";
import { useEffect } from "react";
import { markAsRead } from "./getNotifications";

export function NotificationList({
  notifications,
}: {
  notifications: HydratedNotification[];
}) {
  useEffect(() => {
    setTimeout(() => {
      markAsRead();
    }, 500);
  }, []);

  return (
    <div className="max-w-prose mx-auto w-full">
      <div className="flex flex-col gap-2">
        {notifications.map((n) => {
          if (n.type === "comment") {
            n;
            return <CommentNotification key={n.id} {...n} />;
          }
        })}
      </div>
    </div>
  );
}
