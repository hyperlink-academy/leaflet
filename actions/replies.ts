"use server";

import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
import { v7 } from "uuid";
import {
  AtpBaseClient,
  PubLeafletInteractionsReply,
  PubLeafletInteractionsReplyVisibility,
} from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { getAuthIdentity } from "src/auth";
import { Err, Ok, Result } from "src/result";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
import { documentHasReplyBlock } from "src/utils/documentHasReplyBlock";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { resolveStandardSitePostUrl } from "src/utils/resolveStandardSitePostUrl";
import {
  isDocumentOwner,
  loadDocumentReplies,
  MAX_REPLIES,
  type DocumentReplies,
} from "src/documentReplies";
import { revalidateDocumentPaths } from "src/utils/revalidatePublication";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";

export async function getDocumentReplies(
  subject: string,
): Promise<DocumentReplies> {
  const identity = await getAuthIdentity();
  return loadDocumentReplies(subject, identity?.atp_did ?? null);
}

// The viewer's own recent documents, offered as things to reply with.
export async function getReplyCandidates() {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return [];
  const { data: rows } = await supabaseServerClient.rpc("get_profile_posts", {
    p_did: identity.atp_did,
    p_limit: 30,
  });
  return deduplicateByUriOrdered(rows ?? []).flatMap((row) => {
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

const notAuthenticated: OAuthSessionError = {
  type: "oauth_session_expired",
  message: "Not authenticated",
  did: "",
};

async function agentFor(did: string) {
  const sessionResult = await restoreOAuthSession(did);
  if (!sessionResult.ok) return sessionResult;
  const session = sessionResult.value;
  return Ok(new AtpBaseClient(session.fetchHandler.bind(session)));
}

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

  const findExisting = () =>
    supabaseServerClient
      .from("document_replies")
      .select("uri")
      .eq("subject", args.subject)
      .eq("document", document)
      .maybeSingle();
  const [{ data: docs }, { data: existing }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("uri, data")
      .in("uri", [document, args.subject]),
    findExisting(),
  ]);
  const subjectDoc = docs?.find((d) => d.uri === args.subject);
  if (!subjectDoc || docs?.length !== 2) return Err({ type: "not_found" });
  // Without this anyone could notify the author of a post that never asked
  // for replies.
  const subjectRecord = normalizeDocumentRecord(
    subjectDoc.data,
    subjectDoc.uri,
  );
  if (!subjectRecord || !documentHasReplyBlock(subjectRecord))
    return Err({ type: "replies_closed" });
  if (existing) return Ok({ uri: existing.uri });

  const agent = await agentFor(did);
  if (!agent.ok) return Err(agent.error);

  const record: PubLeafletInteractionsReply.Record = {
    $type: "pub.leaflet.interactions.reply",
    subject: args.subject,
    document,
    createdAt: new Date().toISOString(),
  };
  const collection = ids.PubLeafletInteractionsReply;
  const rkey = TID.nextStr();
  const uri = AtUri.make(did, collection, rkey).toString();
  try {
    await agent.value.com.atproto.repo.createRecord({
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
    subject: args.subject,
    document,
    replier_did: did,
    record: record as unknown as Json,
  });
  if (error) {
    // A concurrent submission of the same document won the
    // (subject, document) key; drop this duplicate record.
    await agent.value.com.atproto.repo
      .deleteRecord({ repo: did, collection, rkey })
      .catch(() => {});
    const { data: winner } = await findExisting();
    return winner ? Ok({ uri: winner.uri }) : Err({ type: "failed" });
  }

  const subjectOwner = new AtUri(args.subject).host;
  if (subjectOwner !== did) {
    const notification: Notification = {
      id: v7(),
      recipient: subjectOwner,
      data: { type: "post_reply", reply_uri: uri, document_uri: args.subject },
    };
    await supabaseServerClient.from("notifications").insert(notification);
    await pingIdentityToUpdateNotification(subjectOwner);
  }

  return Ok({ uri });
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
    .select("subject")
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
  if (row) await revalidateDocumentPaths(row.subject, { neighbours: false });
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
      .select("uri")
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
  // Visible replies are server-rendered into the post's cached pages.
  await revalidateDocumentPaths(args.subject, { neighbours: false });
  return Ok(null);
}
