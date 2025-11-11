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
  let { rootEntity } = useReplicache();
  let cardBorderHidden = useEntity(rootEntity, "theme/card-border-hidden")?.data
    .value;
  return (
    <div className="max-w-prose mx-auto w-full">
      <div className={`flex flex-col ${cardBorderHidden ? "gap-6" : "gap-2"}`}>
        {notifications.map((n) => {
          if (n.type === "comment") {
            n;
            return (
              <CommentNotification
                cardBorderHidden={!!cardBorderHidden}
                key={n.id}
                {...n}
              />
            );
          }
        })}
      </div>
    </div>
  );
}
