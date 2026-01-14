"use server";

import { AtpBaseClient, PubLeafletComment } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";
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
  let identity = await getIdentityData();
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

  await supabaseServerClient.from("bsky_profiles").upsert({
    did: credentialSession.did!,
    record: profile.value as Json,
  });
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
