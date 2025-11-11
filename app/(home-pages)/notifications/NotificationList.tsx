"use client";

import { HydratedNotification } from "src/notifications";
import { CommentNotification } from "./CommentNotication";
import { useEntity, useReplicache } from "src/replicache";
import { useEffect, createContext } from "react";
import { markAsRead } from "./getNotifications";
import { ReplyNotification } from "./ReplyNotification";

export const NotificationContext = createContext({ compact: false });

export function NotificationList({
  notifications,
  compact,
}: {
  notifications: HydratedNotification[];
  compact?: boolean;
}) {
  useEffect(() => {
    setTimeout(() => {
      markAsRead();
    }, 500);
  }, []);

  if (notifications.length === 0)
    return (
      <div className="w-full container italic text-tertiary text-center sm:p-4 p-3">
        no notifications yet...
      </div>
    );
  return (
    <NotificationContext.Provider value={{ compact: compact ?? false }}>
      <div className="max-w-prose mx-auto w-full">
        <div className={`flex flex-col gap-2`}>
          {notifications.map((n) => {
            if (n.type === "comment") {
              if (n.parentData) return <ReplyNotification key={n.id} {...n} />;
              return <CommentNotification key={n.id} {...n} />;
            }
          })}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}
