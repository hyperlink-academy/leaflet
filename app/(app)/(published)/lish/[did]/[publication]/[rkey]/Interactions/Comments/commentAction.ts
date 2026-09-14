"use server";

import { AtpBaseClient, PubLeafletComment } from "lexicons/api";
import { getAuthIdentity } from "src/auth";
import { PubLeafletRichtextFacet } from "lexicons/api";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { AtUri, lexToJson, Un$Typed } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import {
  Notification,
  NotificationData,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { v7 } from "uuid";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";
import { tombstoneComment } from "src/comments/tombstoneComment";

type PublishCommentResult =
  | { success: true; record: Json; profile: any; uri: string }
  | { success: false; error: OAuthSessionError };

export async function publishComment(args: {
  document: string;
  pageId?: string;
  comment: {
    plaintext: string;
    facets: PubLeafletRichtextFacet.Main[];
    replyTo?: string;
    attachment: PubLeafletComment.Record["attachment"];
  };
}): Promise<PublishCommentResult> {
  let identity = await getAuthIdentity();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let record: Un$Typed<PubLeafletComment.Record> = {
    subject: args.document,
    onPage: args.pageId,
    createdAt: new Date().toISOString(),
    plaintext: args.comment.plaintext,
    facets: args.comment.facets,
    reply: args.comment.replyTo ? { parent: args.comment.replyTo } : undefined,
    attachment: args.comment.attachment,
  };
  let rkey = TID.nextStr();
  let uri = AtUri.make(credentialSession.did!, "pub.leaflet.comment", rkey);
  let [profile, result] = await Promise.all([
    agent.app.bsky.actor.profile.get({
      repo: credentialSession.did!,
      rkey: "self",
    }),
    agent.pub.leaflet.comment.create(
      { rkey, repo: credentialSession.did! },
      record,
    ),
  ]);

  let { data, error } = await supabaseServerClient
    .from("comments_on_documents")
    .insert({
      uri: uri.toString(),
      document: args.document,
      profile: credentialSession.did!,
      record: {
        $type: "pub.leaflet.comment",
        ...record,
      } as unknown as Json,
    })
    .select();
  let notifications: Notification[] = [];
  let recipient = args.comment.replyTo
    ? new AtUri(args.comment.replyTo).host
    : new AtUri(args.document).host;
  if (recipient !== credentialSession.did) {
    notifications.push({
      id: v7(),
      recipient,
      data: {
        type: "comment",
        comment_uri: uri.toString(),
        parent_uri: args.comment.replyTo,
      },
    });
  }

  // Create mention notifications from comment facets
  const mentionNotifications = createCommentMentionNotifications(
    args.comment.facets,
    uri.toString(),
    credentialSession.did!,
  );
  notifications.push(...mentionNotifications);

  // Insert all notifications and ping recipients
  if (notifications.length > 0) {
    // SOMEDAY: move this out the action with inngest or workflows
    await supabaseServerClient.from("notifications").insert(notifications);

    // Ping all unique recipients
    const uniqueRecipients = [...new Set(notifications.map((n) => n.recipient))];
    await Promise.all(
      uniqueRecipients.map((r) => pingIdentityToUpdateNotification(r)),
    );
  }

  return {
    success: true,
    record: data?.[0].record as Json,
    profile: lexToJson(profile.value),
    uri: uri.toString(),
  };
}

type OwnCommentError =
  | OAuthSessionError
  | { type: "forbidden" | "failed"; message: string };

type DeleteCommentResult =
  | { success: true }
  | { success: false; error: OwnCommentError };

type UpdateCommentResult =
  | { success: true; record: Json }
  | { success: false; error: OwnCommentError };

// Resolves an authenticated agent for a comment the viewer authored.
async function authorAgentForComment(
  commentUri: string,
): Promise<
  | { ok: true; uri: AtUri; agent: AtpBaseClient; did: string }
  | { ok: false; error: OwnCommentError }
> {
  let identity = await getAuthIdentity();
  let uri: AtUri;
  try {
    uri = new AtUri(commentUri);
  } catch {
    return {
      ok: false,
      error: { type: "failed", message: "Invalid comment" },
    };
  }
  if (
    !identity?.atp_did ||
    identity.atp_did !== uri.host ||
    uri.collection !== "pub.leaflet.comment"
  ) {
    return {
      ok: false,
      error: { type: "forbidden", message: "Not your comment" },
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { ok: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  return { ok: true, uri, agent, did: credentialSession.did! };
}

export async function updateComment(args: {
  uri: string;
  plaintext: string;
  facets: PubLeafletRichtextFacet.Main[];
}): Promise<UpdateCommentResult> {
  let auth = await authorAgentForComment(args.uri);
  if (!auth.ok) return { success: false, error: auth.error };
  let { uri, agent, did } = auth;

  let { data: existing } = await supabaseServerClient
    .from("comments_on_documents")
    .select("record, past_versions")
    .eq("uri", args.uri)
    .maybeSingle();
  if (!existing) {
    return {
      success: false,
      error: { type: "failed", message: "Comment not found" },
    };
  }

  let previous = existing.record as PubLeafletComment.Record;
  let record: Un$Typed<PubLeafletComment.Record> = {
    subject: previous.subject,
    onPage: previous.onPage,
    createdAt: previous.createdAt,
    reply: previous.reply,
    attachment: previous.attachment,
    plaintext: args.plaintext,
    facets: args.facets,
  };
  try {
    await agent.pub.leaflet.comment.put({ rkey: uri.rkey, repo: did }, record);
  } catch (e) {
    console.error("Failed to update comment record", e);
    return {
      success: false,
      error: { type: "failed", message: "Couldn't update the comment" },
    };
  }

  let stored = { $type: "pub.leaflet.comment", ...record } as unknown as Json;
  let pastVersions = Array.isArray(existing.past_versions)
    ? existing.past_versions
    : [];
  await supabaseServerClient
    .from("comments_on_documents")
    .update({
      record: stored,
      past_versions: [
        ...pastVersions,
        { record: existing.record, replaced_at: new Date().toISOString() },
      ],
    })
    .eq("uri", args.uri);
  return { success: true, record: stored };
}

export async function deleteComment(args: {
  uri: string;
}): Promise<DeleteCommentResult> {
  let auth = await authorAgentForComment(args.uri);
  if (!auth.ok) return { success: false, error: auth.error };
  let { uri, agent, did } = auth;
  try {
    await agent.pub.leaflet.comment.delete({ rkey: uri.rkey, repo: did });
  } catch (e) {
    console.error("Failed to delete comment record", e);
    return {
      success: false,
      error: { type: "failed", message: "Couldn't delete the comment" },
    };
  }

  // Cached pages are revalidated by the appview when the delete event lands,
  // like publishing; revalidating here would refresh the page mid-action.
  await tombstoneComment(supabaseServerClient, args.uri);
  return { success: true };
}

/**
 * Creates mention notifications from comment facets
 * Handles didMention (people) and atMention (publications/documents)
 */
function createCommentMentionNotifications(
  facets: PubLeafletRichtextFacet.Main[],
  commentUri: string,
  commenterDid: string,
): Notification[] {
  const notifications: Notification[] = [];
  const notifiedRecipients = new Set<string>(); // Avoid duplicate notifications

  for (const facet of facets) {
    for (const feature of facet.features) {
      if (PubLeafletRichtextFacet.isDidMention(feature)) {
        // DID mention - notify the mentioned person directly
        const recipientDid = feature.did;

        // Don't notify yourself
        if (recipientDid === commenterDid) continue;
        // Avoid duplicate notifications to the same person
        if (notifiedRecipients.has(recipientDid)) continue;
        notifiedRecipients.add(recipientDid);

        notifications.push({
          id: v7(),
          recipient: recipientDid,
          data: {
            type: "comment_mention",
            comment_uri: commentUri,
            mention_type: "did",
          },
        });
      } else if (PubLeafletRichtextFacet.isAtMention(feature)) {
        // AT-URI mention - notify the owner of the publication/document
        try {
          const mentionedUri = new AtUri(feature.atURI);
          const recipientDid = mentionedUri.host;

          // Don't notify yourself
          if (recipientDid === commenterDid) continue;
          // Avoid duplicate notifications to the same person for the same mentioned item
          const dedupeKey = `${recipientDid}:${feature.atURI}`;
          if (notifiedRecipients.has(dedupeKey)) continue;
          notifiedRecipients.add(dedupeKey);

          if (isPublicationCollection(mentionedUri.collection)) {
            notifications.push({
              id: v7(),
              recipient: recipientDid,
              data: {
                type: "comment_mention",
                comment_uri: commentUri,
                mention_type: "publication",
                mentioned_uri: feature.atURI,
              },
            });
          } else if (isDocumentCollection(mentionedUri.collection)) {
            notifications.push({
              id: v7(),
              recipient: recipientDid,
              data: {
                type: "comment_mention",
                comment_uri: commentUri,
                mention_type: "document",
                mentioned_uri: feature.atURI,
              },
            });
          }
        } catch (error) {
          console.error("Failed to parse AT-URI for mention:", feature.atURI, error);
        }
      }
    }
  }

  return notifications;
}
