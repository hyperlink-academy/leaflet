"use server";

import { AtUri } from "@atproto/syntax";
import { PubLeafletInteractionsReplyVisibility } from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import { OAuthSessionError } from "src/atproto-oauth";
import { agentFor, notAuthenticated } from "src/utils/agentFor";
import { getAuthIdentity } from "src/auth";
import { Err, Ok, Result } from "src/result";
import {
  deduplicateByUri,
  deduplicateByUriOrdered,
} from "src/utils/deduplicateRecords";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { resolveStandardSitePostUrl } from "src/utils/resolveStandardSitePostUrl";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import { isLeafletManagedPublication } from "src/utils/isLeafletManagedPublication";
import { createPublicationDraft } from "./createPublicationDraft";
import { createNewLeaflet } from "./createNewLeaflet";
import {
  createReplyRecord,
  getReplyTarget as loadReplyTarget,
  documentReplyTargets,
  loadDocumentReplies,
  subjectReplyBlock,
  MAX_REPLIES,
  type DocumentReplies,
} from "src/documentReplies";
import { revalidateDocumentPaths } from "src/utils/revalidatePublication";
import { broadcastDocumentEvent } from "src/documentEvents/broadcast";
import { supabaseServerClient } from "supabase/serverClient";
import type { Json } from "supabase/database.types";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { v7 } from "uuid";

export async function getDocumentReplies(
  subject: string,
): Promise<DocumentReplies> {
  const identity = await getAuthIdentity();
  return loadDocumentReplies(subject, identity?.atp_did ?? null);
}

// The viewer's own recent documents, offered as things to reply with, plus
// the Leaflet publications they could write a new one in.
export async function getReplyCandidates(subject: string) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return { candidates: [], publications: [] };
  const [{ data: rows }, { data: publications }, { data: replies }] =
    await Promise.all([
      supabaseServerClient.rpc("get_profile_posts", {
        p_did: identity.atp_did,
        p_limit: 30,
      }),
      supabaseServerClient
        .from("publications")
        .select("uri, name, record")
        .eq("identity_did", identity.atp_did),
      supabaseServerClient
        .from("document_replies")
        .select("document")
        .eq("subject", subject)
        .eq("replier_did", identity.atp_did),
    ]);
  const submitted = new Set((replies ?? []).map((r) => r.document));
  const candidates = deduplicateByUriOrdered(rows ?? []).flatMap((row) => {
    const candidate = replyCandidate(row, submitted.has(row.uri));
    return candidate?.title ? [candidate] : [];
  });
  return {
    candidates,
    publications: deduplicateByUri(publications ?? []).filter(
      isLeafletManagedPublication,
    ),
  };
}

function replyCandidate(
  row: {
    uri: string;
    data: Json;
    publication_record: Json | null;
    publication_name: string | null;
  },
  submitted: boolean,
) {
  const record = normalizeDocumentRecord(row.data, row.uri);
  if (!record) return null;
  return {
    uri: row.uri,
    title: record.title,
    publishedAt: record.publishedAt ?? null,
    submitted,
    publicationName:
      (row.publication_record
        ? normalizePublicationRecord(row.publication_record)?.name
        : null) ??
      row.publication_name ??
      null,
  };
}

export async function resolveReplyLink(args: {
  subject: string;
  url: string;
}): Promise<
  Result<NonNullable<ReturnType<typeof replyCandidate>>, ReplyError>
> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const document = await resolveStandardSitePostUrl(
    args.url,
    supabaseServerClient,
  ).catch(() => null);
  const error = replyDocumentError(document, identity.atp_did, args.subject);
  if (error || !document) return Err(error ?? { type: "not_found" });

  const [{ data: row }, { data: existing }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select(
        "uri, data, documents_in_publications(publications(name, record))",
      )
      .eq("uri", document)
      .maybeSingle(),
    supabaseServerClient
      .from("document_replies")
      .select("uri")
      .eq("subject", args.subject)
      .eq("document", document)
      .maybeSingle(),
  ]);
  const publication = row?.documents_in_publications[0]?.publications;
  const candidate =
    row &&
    replyCandidate(
      {
        uri: row.uri,
        data: row.data,
        publication_record: publication?.record ?? null,
        publication_name: publication?.name ?? null,
      },
      !!existing,
    );
  if (!candidate) return Err({ type: "not_found" });
  return Ok({ ...candidate, title: candidate.title || "Untitled" });
}

function replyDocumentError(
  document: string | null,
  did: string,
  subject: string,
): ReplyError | null {
  if (!document) return { type: "not_found" };
  if (!isDocumentOwner(document, did)) return { type: "not_your_post" };
  if (document === subject) return { type: "same_post" };
  return null;
}

// Starts a draft, in one of the viewer's publications or as a looseleaf, that
// will be submitted as a reply to `subject` when it's first published.
export async function createReplyDraft(args: {
  subject: string;
  // Key of the reply block the draft was started from
  block: string | null;
  // Null for a looseleaf
  publication_uri: string | null;
}): Promise<Result<{ leaflet: string }, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const block = await subjectReplyBlock(args.subject, args.block);
  if (!block) return Err({ type: "replies_closed" });
  const leaflet = args.publication_uri
    ? await createPublicationDraft(args.publication_uri, "doc")
    : await createNewLeaflet({
        pageType: "doc",
        redirectUser: false,
        analytics: { kind: "reply_looseleaf" },
      });
  if (!leaflet) return Err({ type: "not_owner" });
  const { error } = await supabaseServerClient.from("reply_drafts").insert({
    leaflet,
    subject: args.subject,
    block: block.key ?? null,
    identity_did: identity.atp_did,
  });
  if (error) return Err({ type: "failed" });
  return Ok({ leaflet });
}

export async function getReplyTarget(subject: string) {
  return loadReplyTarget(subject);
}

export async function withdrawReplyDraft(
  leaflet: string,
): Promise<Result<null, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const { data, error } = await supabaseServerClient
    .from("reply_drafts")
    .delete()
    .eq("leaflet", leaflet)
    .eq("identity_did", identity.atp_did)
    .select("leaflet");
  if (error) return Err({ type: "failed" });
  return data.length > 0 ? Ok(null) : Err({ type: "not_owner" });
}

export async function getDocumentReplyTargets(document: string) {
  const identity = await getAuthIdentity();
  return documentReplyTargets(document, identity?.atp_did ?? null);
}

export type ReplyError =
  | {
      type:
        | "not_found"
        | "not_your_post"
        | "same_post"
        | "already_submitted"
        | "replies_closed"
        | "not_owner"
        | "failed";
    }
  | OAuthSessionError;

export async function submitReply(args: {
  subject: string;
  // Key of the reply block submitted through
  block: string | null;
  document: string;
}): Promise<Result<{ uri: string }, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const did = identity.atp_did;
  const document = args.document;
  const error = replyDocumentError(document, did, args.subject);
  if (error) return Err(error);

  const [block, { data: existing }] = await Promise.all([
    subjectReplyBlock(args.subject, args.block),
    supabaseServerClient
      .from("document_replies")
      .select("uri")
      .eq("subject", args.subject)
      .eq("document", document)
      .maybeSingle(),
  ]);
  if (!block) return Err({ type: "replies_closed" });
  if (existing) return Err({ type: "already_submitted" });

  const agent = await agentFor(did);
  if (!agent.ok) return Err(agent.error);
  return createReplyRecord({
    did,
    subject: args.subject,
    block: block.key,
    document,
    agent: agent.value,
  });
}

export async function withdrawReply(
  replyUri: string,
): Promise<Result<null, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  let uri: AtUri;
  try {
    uri = new AtUri(replyUri);
  } catch {
    return Err({ type: "not_owner" });
  }
  if (
    uri.host !== identity.atp_did ||
    uri.collection !== ids.PubLeafletInteractionsReply
  )
    return Err({ type: "not_owner" });

  const agent = await agentFor(identity.atp_did);
  if (!agent.ok) return Err(agent.error);
  // Read before the record goes: the appview may delete the row first.
  const { data: row } = await supabaseServerClient
    .from("document_replies")
    .select("subject, document")
    .eq("uri", replyUri)
    .maybeSingle();
  try {
    await agent.value.com.atproto.repo.deleteRecord({
      repo: uri.host,
      collection: uri.collection,
      rkey: uri.rkey,
    });
  } catch (e) {
    console.error("[replies] deleteRecord failed", e);
    return Err({ type: "failed" });
  }
  await supabaseServerClient
    .from("document_replies")
    .delete()
    .eq("uri", replyUri);
  if (row) {
    await broadcastDocumentEvent(supabaseServerClient, "reply", row.subject);
    await revalidateReply(row);
  }
  return Ok(null);
}

// Both ends are server-rendered into cached pages: the subject lists its
// visible replies, and an accepted reply says what it replies to.
async function revalidateReply(reply: { subject: string; document?: string }) {
  await Promise.all(
    [reply.subject, reply.document].map(
      (uri) => uri && revalidateDocumentPaths(uri, { neighbours: false }),
    ),
  );
}

export async function rejectReply(args: {
  subject: string;
  reply: string;
}): Promise<Result<null, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  if (!isDocumentOwner(args.subject, identity.atp_did))
    return Err({ type: "not_owner" });

  const [{ data: reply }, { data: accepted }] = await Promise.all([
    supabaseServerClient
      .from("document_replies")
      .select("uri")
      .eq("uri", args.reply)
      .eq("subject", args.subject)
      .maybeSingle(),
    supabaseServerClient
      .from("document_reply_visibility")
      .select("reply")
      .eq("subject", args.subject)
      .eq("reply", args.reply)
      .maybeSingle(),
  ]);
  if (!reply) return Err({ type: "not_found" });
  if (accepted) {
    const hidden = await setReplyVisible({ ...args, visible: false });
    if (!hidden.ok) return hidden;
  }

  const { error } = await supabaseServerClient
    .from("document_reply_rejections")
    .upsert(
      { reply: args.reply, subject: args.subject },
      { onConflict: "reply", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[replies] rejection insert failed", error);
    return Err({ type: "failed" });
  }

  await broadcastDocumentEvent(
    supabaseServerClient,
    "reply_visibility",
    args.subject,
  );
  return Ok(null);
}

// Shows or hides one reply on the viewer's own document. Which replies show
// lives in one pub.leaflet.interactions.replyVisibility record in the
// document's repo, keyed by the document's rkey so every change is a plain
// overwrite; the supabase rows mirror what the appview indexes from it.
export async function setReplyVisible(args: {
  subject: string;
  reply: string;
  visible: boolean;
}): Promise<Result<null, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  if (!isDocumentOwner(args.subject, identity.atp_did))
    return Err({ type: "not_owner" });

  const [{ data: replyRows }, { data: allowedRows }] = await Promise.all([
    supabaseServerClient
      .from("document_replies")
      .select("uri, document, replier_did")
      .eq("subject", args.subject)
      .limit(MAX_REPLIES),
    supabaseServerClient
      .from("document_reply_visibility")
      .select("reply")
      .eq("subject", args.subject),
  ]);
  const replies = new Set((replyRows ?? []).map((r) => r.uri));
  if (args.visible && !replies.has(args.reply))
    return Err({ type: "not_found" });

  // Withdrawn replies drop out of the list here, so it can't grow without
  // bound.
  const current = (allowedRows ?? []).map((r) => r.reply);
  const stale = current.filter((r) => !replies.has(r));
  const allowed = current.filter((r) => replies.has(r) && r !== args.reply);
  if (args.visible) allowed.push(args.reply);

  const agent = await agentFor(identity.atp_did);
  if (!agent.ok) return Err(agent.error);

  const subjectUri = new AtUri(args.subject);
  const repo = subjectUri.host;
  const collection = ids.PubLeafletInteractionsReplyVisibility;
  const rkey = subjectUri.rkey;
  try {
    if (allowed.length === 0) {
      await agent.value.com.atproto.repo
        .deleteRecord({ repo, collection, rkey })
        .catch(() => {});
    } else {
      const record: PubLeafletInteractionsReplyVisibility.Record = {
        $type: "pub.leaflet.interactions.replyVisibility",
        subject: args.subject,
        allowed,
      };
      await agent.value.com.atproto.repo.putRecord({
        repo,
        collection,
        rkey,
        record,
        validate: false,
      });
    }
  } catch (e) {
    console.error("[replies] visibility write failed", e);
    return Err({ type: "failed" });
  }

  const removed = args.visible ? stale : [...stale, args.reply];
  if (removed.length > 0)
    await supabaseServerClient
      .from("document_reply_visibility")
      .delete()
      .eq("subject", args.subject)
      .in("reply", removed);
  if (args.visible) {
    const { error } = await supabaseServerClient
      .from("document_reply_visibility")
      .upsert({
        uri: AtUri.make(repo, collection, rkey).toString(),
        subject: args.subject,
        reply: args.reply,
      });
    if (error) console.error("[replies] visibility row upsert failed", error);
  }
  await broadcastDocumentEvent(
    supabaseServerClient,
    "reply_visibility",
    args.subject,
  );
  const reply = replyRows?.find((r) => r.uri === args.reply);
  await revalidateReply({ subject: args.subject, document: reply?.document });
  if (args.visible && reply && reply.replier_did !== identity.atp_did)
    await notifyReplyAccepted(reply.replier_did, args.reply, args.subject);
  return Ok(null);
}

async function notifyReplyAccepted(
  recipient: string,
  reply_uri: string,
  document_uri: string,
) {
  const { count } = await supabaseServerClient
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient", recipient)
    .eq("data->>type", "post_reply_accepted")
    .eq("data->>reply_uri", reply_uri);
  if (count) return;
  const notification: Notification = {
    id: v7(),
    recipient,
    data: { type: "post_reply_accepted", reply_uri, document_uri },
  };
  await supabaseServerClient.from("notifications").insert(notification);
  await pingIdentityToUpdateNotification(recipient);
}
