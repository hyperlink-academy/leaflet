import {
  get_standard_site_posts,
  type StandardSitePostData,
} from "app/api/rpc/[command]/get_standard_site_posts";
import { supabaseServerClient } from "supabase/serverClient";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import type { Json } from "supabase/database.types";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
import { v7 } from "uuid";
import { ids } from "lexicons/api/lexicons";
import type { AtpBaseClient, PubLeafletInteractionsReply } from "lexicons/api";
import { Err, Ok, type Result } from "src/result";
import { documentHasBlock } from "src/utils/documentHasBlock";
import { broadcastDocumentEvent } from "src/documentEvents/broadcast";
import {
  type Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";

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

// Whether `subject` is a published document that asks for replies: without
// this anyone could notify the author of a post that never asked for them.
export async function subjectAcceptsReplies(subject: string): Promise<boolean> {
  const { data: doc } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .eq("uri", subject)
    .maybeSingle();
  if (!doc) return false;
  const record = normalizeDocumentRecord(doc.data, doc.uri);
  return !!record && documentHasBlock(record, ids.PubLeafletBlocksReply);
}

// The post a reply draft answers, for the editor's "Replying to" indicator.
export async function getReplyTarget(
  subject: string,
): Promise<ReplyTarget | null> {
  const { data: doc } = await supabaseServerClient
    .from("documents")
    .select("uri, data, documents_in_publications(publications(uri, record))")
    .eq("uri", subject)
    .maybeSingle();
  if (!doc) return null;
  const record = normalizeDocumentRecord(doc.data, doc.uri);
  if (!record) return null;
  return {
    uri: doc.uri,
    title: record.title || "Untitled",
    href: getDocumentURL(
      record,
      doc.uri,
      doc.documents_in_publications[0]?.publications,
    ),
  };
}

export type CreateReplyError = "not_found" | "failed";

// Writes a pub.leaflet.interactions.reply record in `did`'s repo marking
// `document` (one of theirs) as a reply to `subject`, indexes it and notifies
// the subject's author. Replying with the same document twice is a no-op. The
// caller has already checked that `did` owns `document` and that the subject
// accepts replies.
export async function createReplyRecord(args: {
  did: string;
  subject: string;
  document: string;
  agent: AtpBaseClient;
}): Promise<Result<{ uri: string }, { type: CreateReplyError }>> {
  const { did, subject, document, agent } = args;
  const findExisting = () =>
    supabaseServerClient
      .from("document_replies")
      .select("uri")
      .eq("subject", subject)
      .eq("document", document)
      .maybeSingle();
  const [{ count }, { data: existing }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("uri", { count: "exact", head: true })
      .in("uri", [document, subject]),
    findExisting(),
  ]);
  if (count !== 2) return Err({ type: "not_found" });
  if (existing) return Ok({ uri: existing.uri });

  const record: PubLeafletInteractionsReply.Record = {
    $type: "pub.leaflet.interactions.reply",
    subject,
    document,
    createdAt: new Date().toISOString(),
  };
  const collection = ids.PubLeafletInteractionsReply;
  const rkey = TID.nextStr();
  const uri = AtUri.make(did, collection, rkey).toString();
  try {
    await agent.com.atproto.repo.createRecord({
      repo: did,
      collection,
      rkey,
      record,
      validate: false,
    });
  } catch (e) {
    console.error("[replies] createRecord failed", e);
    return Err({ type: "failed" });
  }
  const { error } = await supabaseServerClient.from("document_replies").upsert({
    uri,
    subject,
    document,
    replier_did: did,
    record: record as unknown as Json,
  });
  if (error) {
    // A concurrent submission of the same document won the
    // (subject, document) key; drop this duplicate record.
    await agent.com.atproto.repo
      .deleteRecord({ repo: did, collection, rkey })
      .catch(() => {});
    const { data: winner } = await findExisting();
    return winner ? Ok({ uri: winner.uri }) : Err({ type: "failed" });
  }

  await broadcastDocumentEvent(supabaseServerClient, "reply", subject);
  const subjectOwner = new AtUri(subject).host;
  if (subjectOwner !== did) {
    const notification: Notification = {
      id: v7(),
      recipient: subjectOwner,
      data: { type: "post_reply", reply_uri: uri, document_uri: subject },
    };
    await supabaseServerClient.from("notifications").insert(notification);
    await pingIdentityToUpdateNotification(subjectOwner);
  }
  return Ok({ uri });
}
