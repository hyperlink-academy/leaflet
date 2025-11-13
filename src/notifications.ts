"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { Tables, TablesInsert } from "supabase/database.types";

type NotificationRow = Tables<"notifications">;

export type Notification = Omit<TablesInsert<"notifications">, "data"> & {
  data: NotificationData;
};

export type NotificationData =
  | { type: "comment"; comment_uri: string; parent_uri?: string }
  | { type: "subscribe"; subscription_uri: string };

export type HydratedNotification =
  | HydratedCommentNotification
  | HydratedSubscribeNotification;
export async function hydrateNotifications(
  notifications: NotificationRow[],
): Promise<Array<HydratedNotification>> {
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

// Type guard to extract notification type
type ExtractNotificationType<T extends NotificationData["type"]> = Extract<
  NotificationData,
  { type: T }
>;

export type HydratedCommentNotification = Awaited<
  ReturnType<typeof hydrateCommentNotifications>
>[0];

async function hydrateCommentNotifications(notifications: NotificationRow[]) {
  const commentNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"comment"> } =>
      (n.data as NotificationData)?.type === "comment",
  );

  if (commentNotifications.length === 0) {
    return [];
  }

  // Fetch comment data from the database
  const commentUris = commentNotifications.flatMap((n) =>
    n.data.parent_uri
      ? [n.data.comment_uri, n.data.parent_uri]
      : [n.data.comment_uri],
  );
  const { data: comments } = await supabaseServerClient
    .from("comments_on_documents")
    .select(
      "*,bsky_profiles(*), documents(*, documents_in_publications(publications(*)))",
    )
    .in("uri", commentUris);

  return commentNotifications.map((notification) => ({
    id: notification.id,
    recipient: notification.recipient,
    created_at: notification.created_at,
    type: "comment" as const,
    comment_uri: notification.data.comment_uri,
    parentData: notification.data.parent_uri
      ? comments?.find((c) => c.uri === notification.data.parent_uri)!
      : undefined,
    commentData: comments?.find(
      (c) => c.uri === notification.data.comment_uri,
    )!,
  }));
}

export type HydratedSubscribeNotification = Awaited<
  ReturnType<typeof hydrateSubscribeNotifications>
>[0];

async function hydrateSubscribeNotifications(notifications: NotificationRow[]) {
  const subscribeNotifications = notifications.filter(
    (
      n,
    ): n is NotificationRow & { data: ExtractNotificationType<"subscribe"> } =>
      (n.data as NotificationData)?.type === "subscribe",
  );

  if (subscribeNotifications.length === 0) {
    return [];
  }

  // Fetch subscription data from the database with related data
  const subscriptionUris = subscribeNotifications.map(
    (n) => n.data.subscription_uri,
  );
  const { data: subscriptions } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("*, identities(bsky_profiles(*)), publications(*)")
    .in("uri", subscriptionUris);

  return subscribeNotifications.map((notification) => ({
    id: notification.id,
    recipient: notification.recipient,
    created_at: notification.created_at,
    type: "subscribe" as const,
    subscription_uri: notification.data.subscription_uri,
    subscriptionData: subscriptions?.find(
      (s) => s.uri === notification.data.subscription_uri,
    )!,
  }));
}

export async function pingIdentityToUpdateNotification(did: string) {
  let channel = supabaseServerClient.channel(`identity.atp_did:${did}`);
  await channel.send({
    type: "broadcast",
    event: "notification",
    payload: { message: "poke" },
  });
  await supabaseServerClient.removeChannel(channel);
}
