"use client";

import { HydratedNotification } from "src/notifications";
import { CommentNotification } from "./CommentNotication";
import { useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { getNotifications, markAsRead } from "actions/getNotifications";
import { ReplyNotification } from "./ReplyNotification";
import { useIdentityData } from "components/IdentityProvider";
import { FollowNotification } from "./FollowNotification";
import { QuoteNotification } from "./QuoteNotification";
import { BskyPostEmbedNotification } from "./BskyPostEmbedNotification";
import { MentionNotification } from "./MentionNotification";
import { CommentMentionNotification } from "./CommentMentionNotification";
import { RecommendNotification } from "./RecommendNotification";
import { NewMemberNotification } from "./NewMemberNotification";
import { GroupedNotification } from "./GroupedNotification";
import { EmptyState } from "components/EmptyState";
import type { NotificationListItem } from "src/notificationGrouping";
import type {
  NotificationCursor,
  NotificationPage,
} from "src/notificationQueries";

export function NotificationList({
  fallbackPage,
}: {
  fallbackPage?: NotificationPage;
}) {
  let { mutate } = useIdentityData();
  useEffect(() => {
    setTimeout(async () => {
      await markAsRead();
      mutate();
    }, 500);
  }, []);

  const getKey = (
    pageIndex: number,
    previousPageData: NotificationPage | null,
  ) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // First page, we don't have previousPageData
    if (pageIndex === 0) return ["notifications", null] as const;

    // Add the cursor to the key
    return ["notifications", previousPageData?.nextCursor ?? null] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, cursor]: readonly [string, NotificationCursor | null]) =>
      getNotifications(cursor),
    {
      fallbackData: fallbackPage ? [fallbackPage] : undefined,
      revalidateFirstPage: false,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more when the trigger element scrolls into view; this also refills
  // pages that shrank from hydration drops or grouping
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating) {
          const hasMore = data && data[data.length - 1]?.nextCursor;
          if (hasMore) {
            setSize(size + 1);
          }
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [data, size, setSize, isValidating]);

  if (!data)
    return (
      <div className="flex justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-contrast" />
      </div>
    );

  const items = data.flatMap((page) => page.items);
  const hasMore = !!data[data.length - 1]?.nextCursor;

  if (items.length === 0 && !hasMore && !isValidating)
    return (
      <EmptyState title="no notifications yet...">
        Here, you'll find notifications about new follows, comments, mentions,
        and replies!
      </EmptyState>
    );
  return (
    <div className="max-w-prose w-full">
      <div className={`relative flex flex-col gap-3`}>
        <h1 className="sm:text-xl text-lg">Notifications</h1>

        {items.map((item) => renderItem(item))}
        <div
          ref={loadMoreRef}
          className="absolute bottom-96 left-0 w-full h-px pointer-events-none"
          aria-hidden="true"
        />
        {isValidating && size > 1 && (
          <div className="text-center text-tertiary py-4">
            Loading more notifications...
          </div>
        )}
      </div>
    </div>
  );
}

function renderItem(item: NotificationListItem) {
  if (item.kind === "group" && item.group.notifications.length > 1)
    return <GroupedNotification key={item.group.id} group={item.group} />;
  const n =
    item.kind === "group" ? item.group.notifications[0] : item.notification;
  return renderNotification(n);
}

function renderNotification(n: HydratedNotification) {
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
  if (n.type === "recommend") {
    return <RecommendNotification key={n.id} {...n} />;
  }
  if (n.type === "new_member") {
    return <NewMemberNotification key={n.id} {...n} />;
  }
}
