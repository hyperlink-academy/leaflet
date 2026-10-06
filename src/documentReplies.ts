import { AtUri } from "@atproto/syntax";
import {
  get_standard_site_posts,
  type StandardSitePostData,
} from "app/api/rpc/[command]/get_standard_site_posts";
import { supabaseServerClient } from "supabase/serverClient";
import type { Json } from "supabase/database.types";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";

export const MAX_REPLIES = 500;

export type DocumentReply = {
  // at-uri of the pub.leaflet.interactions.reply record
  uri: string;
  visible: boolean;
  // Submitted by the viewer
  mine: boolean;
  post: StandardSitePostData;
};

export type DocumentReplies = {
  // The viewer owns the document and moderates its replies
  isAuthor: boolean;
  replies: DocumentReply[];
};

export function isDocumentOwner(documentUri: string, did: string) {
  try {
    return new AtUri(documentUri).host === did;
  } catch {
    return false;
  }
}

// Readers get the replies the author made visible plus their own
// submissions; the author gets everything, pending included. A null viewer
// gets the public list, which is what cached pages render.
export async function loadDocumentReplies(
  subject: string,
  viewer: string | null,
): Promise<DocumentReplies> {
  const [{ data: rows }, { data: allowedRows }] = await Promise.all([
    supabaseServerClient
      .from("document_replies")
      .select("uri, document, replier_did")
      .eq("subject", subject)
      .order("indexed_at", { ascending: true })
      .limit(MAX_REPLIES),
    supabaseServerClient
      .from("document_reply_visibility")
      .select("reply")
      .eq("subject", subject),
  ]);
  const isAuthor = !!viewer && isDocumentOwner(subject, viewer);
  const allowed = new Set((allowedRows ?? []).map((r) => r.reply));

  const shown = (rows ?? [])
    .map((r) => ({
      uri: r.uri,
      document: r.document,
      visible: allowed.has(r.uri),
      mine: !!viewer && r.replier_did === viewer,
    }))
    .filter((r) => isAuthor || r.visible || r.mine);
  if (shown.length === 0) return { isAuthor, replies: [] };

  const {
    result: { posts },
  } = await get_standard_site_posts.handler(
    { uris: shown.map((r) => r.document) },
    { supabase: supabaseServerClient },
  );
  const postsByUri = new Map(posts.map((p) => [p.uri, p]));

  return {
    isAuthor,
    replies: shown.flatMap(({ document, ...reply }) => {
      const post = postsByUri.get(document);
      return post ? [{ ...reply, post }] : [];
    }),
  };
}

export type ReplyTarget = { uri: string; title: string; href: string };

// A document's submissions as a reply, each with the document it replies to:
// the embed getPostPageData selects.
type ReplySubmission = {
  uri: string;
  subject: string;
  documents: {
    uri: string;
    data: Json;
    documents_in_publications: {
      publications: { uri: string; record: Json | null } | null;
    }[];
  } | null;
};

// The documents that show a document as an accepted reply.
export async function acceptedReplyTargets(
  submissions: ReplySubmission[],
): Promise<ReplyTarget[]> {
  if (submissions.length === 0) return [];
  const { data: allowedRows } = await supabaseServerClient
    .from("document_reply_visibility")
    .select("reply")
    .in(
      "subject",
      submissions.map((r) => r.subject),
    )
    .in(
      "reply",
      submissions.map((r) => r.uri),
    );
  const allowed = new Set((allowedRows ?? []).map((r) => r.reply));

  return submissions.flatMap((row) => {
    const subject = row.documents;
    if (!allowed.has(row.uri) || !subject) return [];
    const record = normalizeDocumentRecord(subject.data, subject.uri);
    if (!record) return [];
    return [
      {
        uri: subject.uri,
        title: record.title || "Untitled",
        href: getDocumentURL(
          record,
          subject.uri,
          subject.documents_in_publications[0]?.publications,
        ),
      },
    ];
  });
}
