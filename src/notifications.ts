"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { Tables, TablesInsert } from "supabase/database.types";

type NotificationRow = Tables<"notifications">;

export type Notification = Omit<TablesInsert<"notifications">, "data"> & {
  data: NotificationData;
};
// Notification data types (for writing to the notifications table)
export type NotificationData =
  | { type: "comment"; comment_uri: string }
  | { type: "subscribe"; subscription_uri: string };

// Hydrated notification types
export type HydratedCommentNotification = {
  id: string;
  recipient: string;
  created_at: string;
  type: "comment";
  comment_uri: string;
  commentData?: Tables<"comments_on_documents">;
};

export type HydratedSubscribeNotification = {
  id: string;
  recipient: string;
  created_at: string;
  type: "subscribe";
  subscription_uri: string;
  subscriptionData?: Tables<"publication_subscriptions">;
};

export type HydratedNotification =
  | HydratedCommentNotification
  | HydratedSubscribeNotification;

// Type guard to extract notification type
type ExtractNotificationType<T extends NotificationData["type"]> = Extract<
  NotificationData,
  { type: T }
>;

// Hydrator function type
type NotificationHydrator<T extends NotificationData["type"]> = (
  notifications: NotificationRow[],
) => Promise<Array<HydratedNotification & { type: T }>>;

/**
 * Hydrates comment notifications
 */
async function hydrateCommentNotifications(
  notifications: NotificationRow[],
): Promise<HydratedCommentNotification[]> {
  const commentNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"comment"> } =>
      (n.data as NotificationData)?.type === "comment",
  );

  if (commentNotifications.length === 0) {
    return [];
  }

  // Fetch comment data from the database
  const commentUris = commentNotifications.map((n) => n.data.comment_uri);
  const { data: comments } = await supabaseServerClient
    .from("comments_on_documents")
    .select("*")
    .in("uri", commentUris);

  return commentNotifications.map((notification) => ({
    id: notification.id,
    recipient: notification.recipient,
    created_at: notification.created_at,
    type: "comment" as const,
    comment_uri: notification.data.comment_uri,
    commentData: comments?.find((c) => c.uri === notification.data.comment_uri),
  }));
}

/**
 * Hydrates subscribe notifications
 */
async function hydrateSubscribeNotifications(
  notifications: NotificationRow[],
): Promise<HydratedSubscribeNotification[]> {
  const subscribeNotifications = notifications.filter(
    (
      n,
    ): n is NotificationRow & { data: ExtractNotificationType<"subscribe"> } =>
      (n.data as NotificationData)?.type === "subscribe",
  );

  if (subscribeNotifications.length === 0) {
    return [];
  }

  // Fetch subscription data from the database
  const subscriptionUris = subscribeNotifications.map(
    (n) => n.data.subscription_uri,
  );
  const { data: subscriptions } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("*")
    .in("uri", subscriptionUris);

  return subscribeNotifications.map((notification) => ({
    id: notification.id,
    recipient: notification.recipient,
    created_at: notification.created_at,
    type: "subscribe" as const,
    subscription_uri: notification.data.subscription_uri,
    subscriptionData: subscriptions?.find(
      (s) => s.uri === notification.data.subscription_uri,
    ),
  }));
}

/**
 * Main hydration function that processes all notifications
 */
export async function hydrateNotifications(
  notifications: NotificationRow[],
): Promise<HydratedNotification[]> {
  // Call all hydrators in parallel
  const [commentNotifications, subscribeNotifications] = await Promise.all([
    hydrateCommentNotifications(notifications),
    hydrateSubscribeNotifications(notifications),
  ]);

  // Combine all hydrated notifications
  const allHydrated = [...commentNotifications, ...subscribeNotifications];

  // Sort by created_at to maintain order
  allHydrated.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return allHydrated;
}
