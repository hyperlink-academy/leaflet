"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { Tables, TablesInsert } from "supabase/database.types";
import { AtUri } from "@atproto/syntax";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

type NotificationRow = Tables<"notifications">;

export type Notification = Omit<TablesInsert<"notifications">, "data"> & {
  data: NotificationData;
};

export type NotificationData =
  | { type: "comment"; comment_uri: string; parent_uri?: string }
  | { type: "subscribe"; subscription_uri: string }
  | { type: "quote"; bsky_post_uri: string; document_uri: string }
  | { type: "bsky_post_embed"; document_uri: string; bsky_post_uri: string }
  | { type: "mention"; document_uri: string; mention_type: "did" }
  | { type: "mention"; document_uri: string; mention_type: "publication"; mentioned_uri: string }
  | { type: "mention"; document_uri: string; mention_type: "document"; mentioned_uri: string }
  | { type: "comment_mention"; comment_uri: string; mention_type: "did" }
  | { type: "comment_mention"; comment_uri: string; mention_type: "publication"; mentioned_uri: string }
  | { type: "comment_mention"; comment_uri: string; mention_type: "document"; mentioned_uri: string }
  | { type: "recommend"; document_uri: string; recommend_uri: string };

export type HydratedNotification =
  | HydratedCommentNotification
  | HydratedSubscribeNotification
  | HydratedQuoteNotification
  | HydratedBskyPostEmbedNotification
  | HydratedMentionNotification
  | HydratedCommentMentionNotification
  | HydratedRecommendNotification;
export async function hydrateNotifications(
  notifications: NotificationRow[],
): Promise<Array<HydratedNotification>> {
  // Call all hydrators in parallel
  const [commentNotifications, subscribeNotifications, quoteNotifications, bskyPostEmbedNotifications, mentionNotifications, commentMentionNotifications, recommendNotifications] = await Promise.all([
    hydrateCommentNotifications(notifications),
    hydrateSubscribeNotifications(notifications),
    hydrateQuoteNotifications(notifications),
    hydrateBskyPostEmbedNotifications(notifications),
    hydrateMentionNotifications(notifications),
    hydrateCommentMentionNotifications(notifications),
    hydrateRecommendNotifications(notifications),
  ]);

  // Combine all hydrated notifications
  const allHydrated = [...commentNotifications, ...subscribeNotifications, ...quoteNotifications, ...bskyPostEmbedNotifications, ...mentionNotifications, ...commentMentionNotifications, ...recommendNotifications];

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

  return commentNotifications
    .map((notification) => {
      const commentData = comments?.find((c) => c.uri === notification.data.comment_uri);
      if (!commentData) return null;
      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "comment" as const,
        comment_uri: notification.data.comment_uri,
        parentData: notification.data.parent_uri
          ? comments?.find((c) => c.uri === notification.data.parent_uri)
          : undefined,
        commentData,
        normalizedDocument: normalizeDocumentRecord(commentData.documents?.data, commentData.documents?.uri),
        normalizedPublication: normalizePublicationRecord(
          commentData.documents?.documents_in_publications[0]?.publications?.record,
        ),
      };
    })
    .filter((n) => n !== null);
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

  return subscribeNotifications
    .map((notification) => {
      const subscriptionData = subscriptions?.find((s) => s.uri === notification.data.subscription_uri);
      if (!subscriptionData) return null;
      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "subscribe" as const,
        subscription_uri: notification.data.subscription_uri,
        subscriptionData,
        normalizedPublication: normalizePublicationRecord(subscriptionData.publications?.record),
      };
    })
    .filter((n) => n !== null);
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

  return quoteNotifications
    .map((notification) => {
      const bskyPost = bskyPosts?.find((p) => p.uri === notification.data.bsky_post_uri);
      const document = documents?.find((d) => d.uri === notification.data.document_uri);
      if (!bskyPost || !document) return null;
      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "quote" as const,
        bsky_post_uri: notification.data.bsky_post_uri,
        document_uri: notification.data.document_uri,
        bskyPost,
        document,
        normalizedDocument: normalizeDocumentRecord(document.data, document.uri),
        normalizedPublication: normalizePublicationRecord(
          document.documents_in_publications[0]?.publications?.record,
        ),
      };
    })
    .filter((n) => n !== null);
}

export type HydratedBskyPostEmbedNotification = Awaited<
  ReturnType<typeof hydrateBskyPostEmbedNotifications>
>[0];

async function hydrateBskyPostEmbedNotifications(notifications: NotificationRow[]) {
  const bskyPostEmbedNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"bsky_post_embed"> } =>
      (n.data as NotificationData)?.type === "bsky_post_embed",
  );

  if (bskyPostEmbedNotifications.length === 0) {
    return [];
  }

  // Fetch document data (the leaflet that embedded the post)
  const documentUris = bskyPostEmbedNotifications.map((n) => n.data.document_uri);
  const bskyPostUris = bskyPostEmbedNotifications.map((n) => n.data.bsky_post_uri);

  const [{ data: documents }, { data: cachedBskyPosts }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*, documents_in_publications(publications(*))")
      .in("uri", documentUris),
    supabaseServerClient
      .from("bsky_posts")
      .select("*")
      .in("uri", bskyPostUris),
  ]);

  // Find which posts we need to fetch from the API
  const cachedPostUris = new Set(cachedBskyPosts?.map((p) => p.uri) ?? []);
  const missingPostUris = bskyPostUris.filter((uri) => !cachedPostUris.has(uri));

  // Fetch missing posts from Bluesky API
  const fetchedPosts = new Map<string, { text: string } | null>();
  if (missingPostUris.length > 0) {
    try {
      const { AtpAgent } = await import("@atproto/api");
      const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
      const response = await agent.app.bsky.feed.getPosts({ uris: missingPostUris });
      for (const post of response.data.posts) {
        const record = post.record as { text?: string };
        fetchedPosts.set(post.uri, { text: record.text ?? "" });
      }
    } catch (error) {
      console.error("Failed to fetch Bluesky posts:", error);
    }
  }

  // Extract unique DIDs from document URIs to resolve handles
  const documentCreatorDids = [...new Set(documentUris.map((uri) => new AtUri(uri).host))];

  // Resolve DIDs to handles in parallel
  const didToHandleMap = new Map<string, string | null>();
  await Promise.all(
    documentCreatorDids.map(async (did) => {
      try {
        const resolved = await idResolver.did.resolve(did);
        const handle = resolved?.alsoKnownAs?.[0]
          ? resolved.alsoKnownAs[0].slice(5) // Remove "at://" prefix
          : null;
        didToHandleMap.set(did, handle);
      } catch (error) {
        console.error(`Failed to resolve DID ${did}:`, error);
        didToHandleMap.set(did, null);
      }
    }),
  );

  return bskyPostEmbedNotifications
    .map((notification) => {
      const document = documents?.find((d) => d.uri === notification.data.document_uri);
      if (!document) return null;

      const documentCreatorDid = new AtUri(notification.data.document_uri).host;
      const documentCreatorHandle = didToHandleMap.get(documentCreatorDid) ?? null;

      // Get post text from cache or fetched data
      const cachedPost = cachedBskyPosts?.find((p) => p.uri === notification.data.bsky_post_uri);
      const postView = cachedPost?.post_view as { record?: { text?: string } } | undefined;
      const bskyPostText = postView?.record?.text ?? fetchedPosts.get(notification.data.bsky_post_uri)?.text ?? null;

      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "bsky_post_embed" as const,
        document_uri: notification.data.document_uri,
        bsky_post_uri: notification.data.bsky_post_uri,
        document,
        documentCreatorHandle,
        bskyPostText,
        normalizedDocument: normalizeDocumentRecord(document.data, document.uri),
        normalizedPublication: normalizePublicationRecord(
          document.documents_in_publications[0]?.publications?.record,
        ),
      };
    })
    .filter((n) => n !== null);
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

  // Extract unique DIDs from document URIs to resolve handles
  const documentCreatorDids = [...new Set(documentUris.map((uri) => new AtUri(uri).host))];

  // Resolve DIDs to handles in parallel
  const didToHandleMap = new Map<string, string | null>();
  await Promise.all(
    documentCreatorDids.map(async (did) => {
      try {
        const resolved = await idResolver.did.resolve(did);
        const handle = resolved?.alsoKnownAs?.[0]
          ? resolved.alsoKnownAs[0].slice(5) // Remove "at://" prefix
          : null;
        didToHandleMap.set(did, handle);
      } catch (error) {
        console.error(`Failed to resolve DID ${did}:`, error);
        didToHandleMap.set(did, null);
      }
    }),
  );

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

  return mentionNotifications
    .map((notification) => {
      const document = documents?.find((d) => d.uri === notification.data.document_uri);
      if (!document) return null;

      const mentionedUri = notification.data.mention_type !== "did"
        ? (notification.data as Extract<ExtractNotificationType<"mention">, { mentioned_uri: string }>).mentioned_uri
        : undefined;

      const documentCreatorDid = new AtUri(notification.data.document_uri).host;
      const documentCreatorHandle = didToHandleMap.get(documentCreatorDid) ?? null;

      const mentionedPublication = mentionedUri ? mentionedPublications?.find((p) => p.uri === mentionedUri) : undefined;
      const mentionedDoc = mentionedUri ? mentionedDocuments?.find((d) => d.uri === mentionedUri) : undefined;

      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "mention" as const,
        document_uri: notification.data.document_uri,
        mention_type: notification.data.mention_type,
        mentioned_uri: mentionedUri,
        document,
        documentCreatorHandle,
        mentionedPublication,
        mentionedDocument: mentionedDoc,
        normalizedDocument: normalizeDocumentRecord(document.data, document.uri),
        normalizedPublication: normalizePublicationRecord(
          document.documents_in_publications[0]?.publications?.record,
        ),
        normalizedMentionedPublication: normalizePublicationRecord(mentionedPublication?.record),
        normalizedMentionedDocument: normalizeDocumentRecord(mentionedDoc?.data, mentionedDoc?.uri),
      };
    })
    .filter((n) => n !== null);
}

export type HydratedCommentMentionNotification = Awaited<
  ReturnType<typeof hydrateCommentMentionNotifications>
>[0];

async function hydrateCommentMentionNotifications(notifications: NotificationRow[]) {
  const commentMentionNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"comment_mention"> } =>
      (n.data as NotificationData)?.type === "comment_mention",
  );

  if (commentMentionNotifications.length === 0) {
    return [];
  }

  // Fetch comment data from the database
  const commentUris = commentMentionNotifications.map((n) => n.data.comment_uri);
  const { data: comments } = await supabaseServerClient
    .from("comments_on_documents")
    .select(
      "*, bsky_profiles(*), documents(*, documents_in_publications(publications(*)))",
    )
    .in("uri", commentUris);

  // Extract unique DIDs from comment URIs to resolve handles
  const commenterDids = [...new Set(commentUris.map((uri) => new AtUri(uri).host))];

  // Resolve DIDs to handles in parallel
  const didToHandleMap = new Map<string, string | null>();
  await Promise.all(
    commenterDids.map(async (did) => {
      try {
        const resolved = await idResolver.did.resolve(did);
        const handle = resolved?.alsoKnownAs?.[0]
          ? resolved.alsoKnownAs[0].slice(5) // Remove "at://" prefix
          : null;
        didToHandleMap.set(did, handle);
      } catch (error) {
        console.error(`Failed to resolve DID ${did}:`, error);
        didToHandleMap.set(did, null);
      }
    }),
  );

  // Fetch mentioned publications and documents
  const mentionedPublicationUris = commentMentionNotifications
    .filter((n) => n.data.mention_type === "publication")
    .map((n) => (n.data as Extract<ExtractNotificationType<"comment_mention">, { mention_type: "publication" }>).mentioned_uri);

  const mentionedDocumentUris = commentMentionNotifications
    .filter((n) => n.data.mention_type === "document")
    .map((n) => (n.data as Extract<ExtractNotificationType<"comment_mention">, { mention_type: "document" }>).mentioned_uri);

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

  return commentMentionNotifications
    .map((notification) => {
      const commentData = comments?.find((c) => c.uri === notification.data.comment_uri);
      if (!commentData) return null;

      const mentionedUri = notification.data.mention_type !== "did"
        ? (notification.data as Extract<ExtractNotificationType<"comment_mention">, { mentioned_uri: string }>).mentioned_uri
        : undefined;

      const commenterDid = new AtUri(notification.data.comment_uri).host;
      const commenterHandle = didToHandleMap.get(commenterDid) ?? null;

      const mentionedPublication = mentionedUri ? mentionedPublications?.find((p) => p.uri === mentionedUri) : undefined;
      const mentionedDoc = mentionedUri ? mentionedDocuments?.find((d) => d.uri === mentionedUri) : undefined;

      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "comment_mention" as const,
        comment_uri: notification.data.comment_uri,
        mention_type: notification.data.mention_type,
        mentioned_uri: mentionedUri,
        commentData,
        commenterHandle,
        mentionedPublication,
        mentionedDocument: mentionedDoc,
        normalizedDocument: normalizeDocumentRecord(commentData.documents?.data, commentData.documents?.uri),
        normalizedPublication: normalizePublicationRecord(
          commentData.documents?.documents_in_publications[0]?.publications?.record,
        ),
        normalizedMentionedPublication: normalizePublicationRecord(mentionedPublication?.record),
        normalizedMentionedDocument: normalizeDocumentRecord(mentionedDoc?.data, mentionedDoc?.uri),
      };
    })
    .filter((n) => n !== null);
}

export type HydratedRecommendNotification = Awaited<
  ReturnType<typeof hydrateRecommendNotifications>
>[0];

async function hydrateRecommendNotifications(notifications: NotificationRow[]) {
  const recommendNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"recommend"> } =>
      (n.data as NotificationData)?.type === "recommend",
  );

  if (recommendNotifications.length === 0) {
    return [];
  }

  // Fetch recommend data from the database
  const recommendUris = recommendNotifications.map((n) => n.data.recommend_uri);
  const documentUris = recommendNotifications.map((n) => n.data.document_uri);

  const [{ data: recommends }, { data: documents }] = await Promise.all([
    supabaseServerClient
      .from("recommends_on_documents")
      .select("*, identities(bsky_profiles(*))")
      .in("uri", recommendUris),
    supabaseServerClient
      .from("documents")
      .select("*, documents_in_publications(publications(*))")
      .in("uri", documentUris),
  ]);

  return recommendNotifications
    .map((notification) => {
      const recommendData = recommends?.find((r) => r.uri === notification.data.recommend_uri);
      const document = documents?.find((d) => d.uri === notification.data.document_uri);
      if (!recommendData || !document) return null;
      return {
        id: notification.id,
        recipient: notification.recipient,
        created_at: notification.created_at,
        type: "recommend" as const,
        recommend_uri: notification.data.recommend_uri,
        document_uri: notification.data.document_uri,
        recommendData,
        document,
        normalizedDocument: normalizeDocumentRecord(document.data, document.uri),
        normalizedPublication: normalizePublicationRecord(
          document.documents_in_publications[0]?.publications?.record,
        ),
      };
    })
    .filter((n) => n !== null);
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
