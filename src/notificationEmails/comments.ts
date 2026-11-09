import { pool } from "supabase/pool";
import { AtUri } from "@atproto/syntax";
import { z } from "zod";
import type { Json } from "supabase/database.types";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { commentDeliveryKey } from "src/notificationHistory";

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
     JOIN notification_preferences pref ON pref.identity = i.id AND pref.publication = p.uri AND pref.channel = 'email'
     WHERE c.uri = $1 AND 'comments' = ANY(pref.enabled_types)
       AND pref.comments_enabled_at <= c.indexed_at
       AND i.email IS NOT NULL AND i.atp_did <> $2`,
    [commentUri, authorDid],
  );
  if (!recipients.length) return { sent: 0 };
  const key = process.env.POSTMARK_API_KEY;
  if (!key || key === "POSTMARK_API_TEST")
    throw new Error("Comment email requires POSTMARK_API_KEY");

  let sent = 0;
  for (const recipient of recipients) {
    const params = [
      recipient.identity,
      recipient.publication,
      commentDeliveryKey(commentUri),
    ];
    // Claim before sending so duplicate action/indexer events cannot email twice.
    const { rows: claimed } = await pool.query(
      `INSERT INTO notification_history (identity, publication, channel, notification_type, delivery_key, subject_uri)
       VALUES ($1, $2, 'email', 'comments', $3, $4)
       ON CONFLICT (identity, publication, channel, delivery_key)
       DO UPDATE SET status = 'pending'
       WHERE notification_history.status = 'failed'
       RETURNING identity`,
      [...params, commentUri],
    );
    if (!claimed.length) continue;
    const title =
      normalizeDocumentRecord(recipient.document_data, recipient.document_uri)
        ?.title || "your writing";
    const link = commentResponseURL(
      recipient.publication,
      recipient.document_uri,
    );
    let rejection = false;
    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Postmark-Server-Token": key,
        },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          From:
            process.env.NOTIFICATION_FROM_EMAIL ||
            process.env.DIGEST_FROM_EMAIL ||
            "Leaflet <accounts@leaflet.pub>",
          To: recipient.email,
          Subject: `New comment on ${title}`,
          TextBody: [
            `A new comment on “${title}” in ${recipient.publication_name}:`,
            "",
            (recipient.comment_record.plaintext || "").slice(0, 2000),
            "",
            `Read and respond: ${link}`,
            "",
            "You opted into instant comment emails in this publication’s notification settings.",
            `Manage notifications: ${new URL(`/lish/${new AtUri(recipient.publication).host}/${new AtUri(recipient.publication).rkey}/dashboard/settings?tab=notifications`, link).toString()}`,
          ].join("\n"),
          Tag: "publication-comment",
        }),
      });
      const result = z
        .object({ ErrorCode: z.number(), MessageID: z.string().optional() })
        .parse(await response.json());
      if (!response.ok || result.ErrorCode !== 0) {
        rejection = result.ErrorCode !== 0;
        throw new Error("Postmark rejected comment email");
      }
      await pool.query(
        "UPDATE notification_history SET status='sent', sent_at=now(), provider_message_id=$4 WHERE identity=$1 AND publication=$2 AND channel='email' AND delivery_key=$3",
        [...params, result.MessageID ?? null],
      );
      sent++;
    } catch (error) {
      await pool.query(
        "UPDATE notification_history SET status=$4 WHERE identity=$1 AND publication=$2 AND channel='email' AND delivery_key=$3 AND status='pending'",
        [...params, rejection ? "failed" : "uncertain"],
      );
      // Retry explicit rejections only; a lost response may already have sent.
      if (rejection) throw error;
      console.error("[comment-email] delivery uncertain", {
        commentUri,
        identity: recipient.identity,
      });
    }
  }
  return { sent };
}
