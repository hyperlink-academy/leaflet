"use client";

import { HydratedNotification } from "src/notifications";
import { CommentNotification } from "./CommentNotication";
import { useEntity, useReplicache } from "src/replicache";
import { useEffect } from "react";
import { markAsRead } from "./getNotifications";
import { ReplyNotification } from "./ReplyNotification";

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

  if (notifications.length === 0)
    return (
      <div className="w-full container italic text-tertiary text-center sm:p-4 p-3">
        no notifications yet...
      </div>
    );
  return (
    <div className="max-w-prose mx-auto w-full">
      <div className={`flex flex-col ${cardBorderHidden ? "gap-6" : "gap-2"}`}>
        {notifications.map((n) => {
          if (n.type === "comment") {
            if (n.parentData)
              return (
                <ReplyNotification
                  cardBorderHidden={!!cardBorderHidden}
                  key={n.id}
                  {...n}
                />
              );
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
