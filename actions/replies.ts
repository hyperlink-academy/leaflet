"use server";

import { AtUri } from "@atproto/syntax";
import { PubLeafletInteractionsReplyVisibility } from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import { OAuthSessionError } from "src/atproto-oauth";
import { agentFor, notAuthenticated } from "src/utils/agentFor";
import { getAuthIdentity } from "src/auth";
import { Err, Ok, Result } from "src/result";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
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
  loadDocumentReplies,
  subjectAcceptsReplies,
  MAX_REPLIES,
  type DocumentReplies,
} from "src/documentReplies";
import { revalidateDocumentPaths } from "src/utils/revalidatePublication";
import { broadcastDocumentEvent } from "src/documentEvents/broadcast";
import { supabaseServerClient } from "supabase/serverClient";

export async function getDocumentReplies(
  subject: string,
): Promise<DocumentReplies> {
  const identity = await getAuthIdentity();
  return loadDocumentReplies(subject, identity?.atp_did ?? null);
}

// The viewer's own recent documents, offered as things to reply with, plus
// the Leaflet publications they could write a new one in.
export async function getReplyCandidates() {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return { candidates: [], publications: [] };
  const [{ data: rows }, { data: publications }] = await Promise.all([
    supabaseServerClient.rpc("get_profile_posts", {
      p_did: identity.atp_did,
      p_limit: 30,
    }),
    supabaseServerClient
      .from("publications")
      .select("uri, name, record")
      .eq("identity_did", identity.atp_did),
  ]);
  const candidates = deduplicateByUriOrdered(rows ?? []).flatMap((row) => {
    const record = normalizeDocumentRecord(row.data, row.uri);
    if (!record?.title) return [];
    return [
      {
        uri: row.uri,
        title: record.title,
        publishedAt: record.publishedAt ?? null,
        publicationName:
          (row.publication_record
            ? normalizePublicationRecord(row.publication_record)?.name
            : null) ??
          row.publication_name ??
          null,
      },
    ];
  });
  return {
    candidates,
    publications: (publications ?? []).filter(isLeafletManagedPublication),
  };
}

// Starts a draft, in one of the viewer's publications or as a looseleaf, that
// will be submitted as a reply to `subject` when it's first published.
export async function createReplyDraft(args: {
  subject: string;
  // Null for a looseleaf
  publication_uri: string | null;
}): Promise<Result<{ leaflet: string }, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  if (!(await subjectAcceptsReplies(args.subject)))
    return Err({ type: "replies_closed" });
  const leaflet = args.publication_uri
    ? await createPublicationDraft(args.publication_uri, "doc", {
        replyTo: args.subject,
      })
    : await createNewLeaflet({
        pageType: "doc",
        redirectUser: false,
        replyTo: args.subject,
        analytics: { kind: "reply_looseleaf" },
      });
  if (!leaflet) return Err({ type: "not_owner" });
  return Ok({ leaflet });
}

export async function getReplyTarget(subject: string) {
  return loadReplyTarget(subject);
}

export type ReplyError =
  | {
      type:
        | "not_found"
        | "not_your_post"
        | "same_post"
        | "replies_closed"
        | "not_owner"
        | "failed";
    }
  | OAuthSessionError;

// Submits one of the viewer's own documents, given by at-uri or by its public
// URL, as a reply to `subject`. Submitting the same document twice is a no-op.
export async function submitReply(args: {
  subject: string;
  reply: { uri: string } | { url: string };
}): Promise<Result<{ uri: string }, ReplyError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const did = identity.atp_did;

  const document =
    "uri" in args.reply
      ? args.reply.uri
      : await resolveStandardSitePostUrl(
          args.reply.url,
          supabaseServerClient,
        ).catch(() => null);
  if (!document) return Err({ type: "not_found" });
  if (!isDocumentOwner(document, did)) return Err({ type: "not_your_post" });
  if (document === args.subject) return Err({ type: "same_post" });

  if (!(await subjectAcceptsReplies(args.subject)))
    return Err({ type: "replies_closed" });

  const agent = await agentFor(did);
  if (!agent.ok) return Err(agent.error);
  return createReplyRecord({
    did,
    subject: args.subject,
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
      .select("uri, document")
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
  await revalidateReply({
    subject: args.subject,
    document: replyRows?.find((r) => r.uri === args.reply)?.document,
  });
  return Ok(null);
}
