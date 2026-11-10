import { pool } from "supabase/pool";
import { AtUri } from "@atproto/syntax";
import type { Json } from "supabase/database.types";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import {
  claimDelivery,
  commentDeliveryKey,
  markFailed,
  markSent,
  markUncertain,
} from "src/notificationHistory";
import { isPostmarkConfigured, sendPostmarkEmail } from "./postmark";
import { EMAIL_NOTIFICATION_ENTITLEMENT_KEY } from "src/entitlements";

type Recipient = {
  identity: string;
  publication: string;
  publication_name: string;
  owner_did: string;
  email: string;
  document_uri: string;
  document_data: Json;
  comment_record: { plaintext?: string };
};

export function commentResponseURL(publication: string, document: string) {
  const pub = new AtUri(publication);
  const doc = new AtUri(document);
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:3000"
      : "https://leaflet.pub");
  const url = new URL(
    `/lish/${pub.host}/${encodeURIComponent(pub.rkey)}/${encodeURIComponent(doc.rkey)}`,
    base,
  );
  url.searchParams.set("interactionDrawer", "comments");
  url.hash = "commentsDrawer";
  return url.toString();
}

// Recheck comment opt-ins, claim each delivery, and send the comment with a reply link.
export async function sendCommentEmails(commentUri: string) {
  const authorDid = new AtUri(commentUri).host;
  const { rows: recipients } = await pool.query<Recipient>(
    `SELECT i.id AS identity, p.uri AS publication, p.name AS publication_name,
       i.atp_did AS owner_did, i.email, d.uri AS document_uri,
       d.data AS document_data, c.record AS comment_record
     FROM comments_on_documents c
     JOIN documents d ON d.uri = c.document
     JOIN documents_in_publications dip ON dip.document = d.uri
     JOIN publications p ON p.uri = dip.publication
     JOIN identities i ON i.atp_did = p.identity_did
     JOIN user_entitlements e ON e.identity_id=i.id AND e.entitlement_key=$3
     JOIN notification_preferences pref ON pref.identity = i.id AND pref.publication = p.uri AND pref.channel = 'email'
     WHERE c.uri = $1 AND 'comments' = ANY(pref.enabled_types)
       AND pref.comments_enabled_at <= c.indexed_at
       AND (e.expires_at IS NULL OR e.expires_at > now())
       AND i.email IS NOT NULL AND i.atp_did <> $2`,
    [commentUri, authorDid, EMAIL_NOTIFICATION_ENTITLEMENT_KEY],
  );
  if (!recipients.length) return { sent: 0 };
  const key = process.env.POSTMARK_API_KEY;
  if (!isPostmarkConfigured(key))
    throw new Error("Comment email requires POSTMARK_API_KEY");

  let sent = 0;
  for (const recipient of recipients) {
    const ref = {
      identity: recipient.identity,
      publication: recipient.publication,
      deliveryKey: commentDeliveryKey(commentUri),
    };
    // Claim before sending so duplicate action/indexer events cannot email twice.
    const claimed = await claimDelivery(pool, {
      ...ref,
      notificationType: "comments",
      subjectUri: commentUri,
    });
    if (!claimed) continue;
    const title =
      normalizeDocumentRecord(recipient.document_data, recipient.document_uri)
        ?.title || "your writing";
    const link = commentResponseURL(
      recipient.publication,
      recipient.document_uri,
    );
    const publication = new AtUri(recipient.publication);
    const result = await sendPostmarkEmail(
      {
        from:
          process.env.NOTIFICATION_FROM_EMAIL ||
          process.env.DIGEST_FROM_EMAIL ||
          "Leaflet <accounts@leaflet.pub>",
        to: recipient.email,
        subject: `New comment on ${title}`,
        text: [
          `A new comment on “${title}” in ${recipient.publication_name}:`,
          "",
          (recipient.comment_record.plaintext || "").slice(0, 2000),
          "",
          `Read and respond: ${link}`,
          "",
          "You opted into instant comment emails in this publication’s notification settings.",
          `Manage notifications: ${new URL(`/lish/${publication.host}/${publication.rkey}/dashboard/settings?tab=notifications`, link).toString()}`,
        ].join("\n"),
        tag: "publication-comment",
      },
      key,
    );
    if (result.outcome === "sent") {
      await markSent(ref, result.messageId);
      sent++;
    } else if (result.outcome === "rejected") {
      await markFailed(ref);
      // Retry explicit rejections only; a lost response may already have sent.
      throw new Error("Postmark rejected comment email");
    } else {
      await markUncertain(ref);
      console.error("[comment-email] delivery uncertain", {
        commentUri,
        identity: recipient.identity,
      });
    }
  }
  return { sent };
}
