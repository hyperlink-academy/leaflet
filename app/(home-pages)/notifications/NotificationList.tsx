"use client";

import { HydratedNotification } from "src/notifications";
import { CommentNotification } from "./CommentNotication";
import { useEffect, createContext } from "react";
import { markAsRead } from "./getNotifications";
import { ReplyNotification } from "./ReplyNotification";
import { useIdentityData } from "components/IdentityProvider";
import { FollowNotification } from "./FollowNotification";
import { QuoteNotification } from "./QuoteNotification";
import { BskyPostEmbedNotification } from "./BskyPostEmbedNotification";
import { MentionNotification } from "./MentionNotification";
import { CommentMentionNotification } from "./CommentMentionNotification";

export function NotificationList({
  notifications,
  compact,
}: {
  notifications: HydratedNotification[];
  compact?: boolean;
}) {
  let { mutate } = useIdentityData();
  useEffect(() => {
    setTimeout(async () => {
      await markAsRead();
      mutate();
    }, 500);
  }, []);

  if (notifications.length === 0)
    return (
      <div className="w-full text-sm flex flex-col gap-1 container italic text-tertiary text-center sm:p-4 p-3">
        <div className="text-base font-bold">no notifications yet...</div>
        Here, you&apos;ll find notifications about new follows, comments,
        mentions, and replies!
      </div>
    );
  return (
    <div className="max-w-prose mx-auto w-full">
      <div className={`flex flex-col gap-2`}>
        {notifications.map((n) => {
          if (n.type === "comment") {
            if (n.parentData) return <ReplyNotification key={n.id} {...n} />;
            return <CommentNotification key={n.id} {...n} />;
          }
          if (n.type === "subscribe") {
            return <FollowNotification key={n.id} {...n} />;
          }
          if (n.type === "quote") {
            return <QuoteNotification key={n.id} {...n} />;
          }
          if (n.type === "bsky_post_embed") {
            return <BskyPostEmbedNotification key={n.id} {...n} />;
          }
          if (n.type === "mention") {
            return <MentionNotification key={n.id} {...n} />;
          }
          if (n.type === "comment_mention") {
            return <CommentMentionNotification key={n.id} {...n} />;
          }
        })}
      </div>
    </div>
  );
}
