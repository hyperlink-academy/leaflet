"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { Tables, TablesInsert } from "supabase/database.types";

type NotificationRow = Tables<"notifications">;

export type Notification = Omit<TablesInsert<"notifications">, "data"> & {
  data: NotificationData;
};

export type NotificationData =
  | { type: "comment"; comment_uri: string; parent_uri?: string }
  | { type: "subscribe"; subscription_uri: string }
  | { type: "quote"; bsky_post_uri: string; document_uri: string }
  | { type: "mention"; document_uri: string; mention_type: "did" }
  | { type: "mention"; document_uri: string; mention_type: "publication"; mentioned_uri: string }
  | { type: "mention"; document_uri: string; mention_type: "document"; mentioned_uri: string };

export type HydratedNotification =
  | HydratedCommentNotification
  | HydratedSubscribeNotification
  | HydratedQuoteNotification
  | HydratedMentionNotification;
export async function hydrateNotifications(
  notifications: NotificationRow[],
): Promise<Array<HydratedNotification>> {
  // Call all hydrators in parallel
  const [commentNotifications, subscribeNotifications, quoteNotifications, mentionNotifications] = await Promise.all([
    hydrateCommentNotifications(notifications),
    hydrateSubscribeNotifications(notifications),
    hydrateQuoteNotifications(notifications),
    hydrateMentionNotifications(notifications),
  ]);

  // Combine all hydrated notifications
  const allHydrated = [...commentNotifications, ...subscribeNotifications, ...quoteNotifications, ...mentionNotifications];

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

export type HydratedQuoteNotification = Awaited<
  ReturnType<typeof hydrateQuoteNotifications>
>[0];

async function hydrateQuoteNotifications(notifications: NotificationRow[]) {
  const quoteNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"quote"> } =>
      (n.data as NotificationData)?.type === "quote",
  );

  if (quoteNotifications.length === 0) {
    return [];
  }

  // Fetch bsky post data and document data
  const bskyPostUris = quoteNotifications.map((n) => n.data.bsky_post_uri);
  const documentUris = quoteNotifications.map((n) => n.data.document_uri);

  const { data: bskyPosts } = await supabaseServerClient
    .from("bsky_posts")
    .select("*")
    .in("uri", bskyPostUris);

  const { data: documents } = await supabaseServerClient
    .from("documents")
    .select("*, documents_in_publications(publications(*))")
    .in("uri", documentUris);

  return quoteNotifications.map((notification) => ({
    id: notification.id,
    recipient: notification.recipient,
    created_at: notification.created_at,
    type: "quote" as const,
    bsky_post_uri: notification.data.bsky_post_uri,
    document_uri: notification.data.document_uri,
    bskyPost: bskyPosts?.find((p) => p.uri === notification.data.bsky_post_uri)!,
    document: documents?.find((d) => d.uri === notification.data.document_uri)!,
  }));
}

export type HydratedMentionNotification = Awaited<
  ReturnType<typeof hydrateMentionNotifications>
>[0];

async function hydrateMentionNotifications(notifications: NotificationRow[]) {
  const mentionNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"mention"> } =>
      (n.data as NotificationData)?.type === "mention",
  );

  if (mentionNotifications.length === 0) {
    return [];
  }

  // Fetch document data from the database
  const documentUris = mentionNotifications.map((n) => n.data.document_uri);
  const { data: documents } = await supabaseServerClient
    .from("documents")
    .select("*, documents_in_publications(publications(*))")
    .in("uri", documentUris);

  // Fetch mentioned publications and documents
  const mentionedPublicationUris = mentionNotifications
    .filter((n) => n.data.mention_type === "publication")
    .map((n) => (n.data as Extract<ExtractNotificationType<"mention">, { mention_type: "publication" }>).mentioned_uri);

  const mentionedDocumentUris = mentionNotifications
    .filter((n) => n.data.mention_type === "document")
    .map((n) => (n.data as Extract<ExtractNotificationType<"mention">, { mention_type: "document" }>).mentioned_uri);

  const [{ data: mentionedPublications }, { data: mentionedDocuments }] = await Promise.all([
    mentionedPublicationUris.length > 0
      ? supabaseServerClient
          .from("publications")
          .select("*")
          .in("uri", mentionedPublicationUris)
      : Promise.resolve({ data: [] }),
    mentionedDocumentUris.length > 0
      ? supabaseServerClient
          .from("documents")
          .select("*, documents_in_publications(publications(*))")
          .in("uri", mentionedDocumentUris)
      : Promise.resolve({ data: [] }),
  ]);

  return mentionNotifications.map((notification) => {
    const mentionedUri = notification.data.mention_type !== "did"
      ? (notification.data as Extract<ExtractNotificationType<"mention">, { mentioned_uri: string }>).mentioned_uri
      : undefined;

    return {
      id: notification.id,
      recipient: notification.recipient,
      created_at: notification.created_at,
      type: "mention" as const,
      document_uri: notification.data.document_uri,
      mention_type: notification.data.mention_type,
      mentioned_uri: mentionedUri,
      document: documents?.find((d) => d.uri === notification.data.document_uri)!,
      mentionedPublication: mentionedUri ? mentionedPublications?.find((p) => p.uri === mentionedUri) : undefined,
      mentionedDocument: mentionedUri ? mentionedDocuments?.find((d) => d.uri === mentionedUri) : undefined,
    };
  });
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
