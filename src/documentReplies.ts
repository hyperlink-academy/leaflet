import {
  get_standard_site_posts,
  type StandardSitePostData,
} from "app/api/rpc/[command]/get_standard_site_posts";
import { supabaseServerClient } from "supabase/serverClient";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import type { Json } from "supabase/database.types";
import { getDocumentURL } from "src/utils/getPublicationURL";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { getLeafletTitle } from "src/utils/getLeafletTitle";
import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
import { v7 } from "uuid";
import { ids } from "lexicons/api/lexicons";
import type {
  AtpBaseClient,
  PubLeafletBlocksReply,
  PubLeafletInteractionsReply,
} from "lexicons/api";
import { Err, Ok, type Result } from "src/result";
import {
  findDocumentBlocks,
  resolveInteractionBlock,
} from "src/utils/documentHasBlock";
import { getProfiles } from "src/identity";
import {
  interactionAuthor,
  type InteractionAuthor,
} from "src/interactionAuthor";
import { broadcastDocumentEvent } from "src/documentEvents/broadcast";
import {
  type Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";

export const MAX_REPLIES = 500;

export type DocumentReply = {
  // at-uri of the pub.leaflet.interactions.reply record
  uri: string;
  // Key of the reply block it was submitted through (see
  // resolveInteractionBlock); null for a published block without a key
  block: string | null;
  replier: InteractionAuthor;
  visible: boolean;
  // Submitted by the viewer
  mine: boolean;
  post: StandardSitePostData;
};

export type ReplyDraft = {
  leaflet: string;
  title: string;
  block: string | null;
  publication: StandardSitePostData["publication"];
};

export type DocumentReplies = {
  // The viewer owns the document and moderates its replies
  isAuthor: boolean;
  replies: DocumentReply[];
  drafts: ReplyDraft[];
};

// Readers get the replies the author made visible plus their own
// submissions; the author gets everything, pending included. A null viewer
// gets the public list, which is what cached pages render.
export async function loadDocumentReplies(
  subject: string,
  viewer: string | null | Promise<string | null>,
): Promise<DocumentReplies> {
  const viewerDid = Promise.resolve(viewer);
  const [{ blocks, ...replies }, drafts] = await Promise.all([
    loadReplies(subject, viewerDid),
    viewerDid.then((did) => (did ? loadReplyDrafts(subject, did) : [])),
  ]);
  return {
    ...replies,
    drafts: drafts.map((d) => ({
      ...d,
      block: resolveInteractionBlock(blocks, d.block)?.key ?? null,
    })),
  };
}

async function loadReplies(subject: string, viewerDid: Promise<string | null>) {
  const [{ data: rows }, { data: allowedRows }, { data: doc }, viewer] =
    await Promise.all([
      supabaseServerClient
        .from("document_replies")
        .select(
          "uri, document, replier_did, record, document_reply_rejections(reply)",
        )
        .eq("subject", subject)
        .order("indexed_at", { ascending: true })
        .limit(MAX_REPLIES),
      supabaseServerClient
        .from("document_reply_visibility")
        .select("reply")
        .eq("subject", subject),
      supabaseServerClient
        .from("documents")
        .select("uri, data")
        .eq("uri", subject)
        .maybeSingle(),
      viewerDid,
    ]);
  const isAuthor = !!viewer && isDocumentOwner(subject, viewer);
  const allowed = new Set((allowedRows ?? []).map((r) => r.reply));
  const blocks = replyBlocksOf(
    doc && normalizeDocumentRecord(doc.data, doc.uri),
  );

  const shown = (rows ?? [])
    .filter((r) => !r.document_reply_rejections)
    .map((r) => ({
      uri: r.uri,
      document: r.document,
      replier_did: r.replier_did,
      block:
        resolveInteractionBlock(
          blocks,
          (r.record as PubLeafletInteractionsReply.Record).block,
        )?.key ?? null,
      visible: allowed.has(r.uri),
      mine: !!viewer && r.replier_did === viewer,
    }))
    .filter((r) => isAuthor || r.visible || r.mine);
  if (shown.length === 0) return { isAuthor, blocks, replies: [] };

  const [
    {
      result: { posts },
    },
    profiles,
  ] = await Promise.all([
    get_standard_site_posts.handler(
      { uris: shown.map((r) => r.document) },
      { supabase: supabaseServerClient },
    ),
    getProfiles([...new Set(shown.map((r) => r.replier_did))]),
  ]);
  const postsByUri = new Map(posts.map((p) => [p.uri, p]));

  return {
    isAuthor,
    blocks,
    replies: shown.flatMap(({ document, replier_did, ...reply }) => {
      const post = postsByUri.get(document);
      return post
        ? [
            {
              ...reply,
              replier: interactionAuthor(replier_did, profiles),
              post,
            },
          ]
        : [];
    }),
  };
}

async function loadReplyDrafts(
  subject: string,
  viewer: string,
): Promise<ReplyDraft[]> {
  const { data: rows } = await supabaseServerClient
    .from("reply_drafts")
    .select(
      `leaflet, block,
      permission_tokens(title,
        leaflets_in_publications(title, doc, archived, publications(uri, record)),
        leaflets_to_documents(title, document))`,
    )
    .eq("subject", subject)
    .eq("identity_did", viewer);
  return (rows ?? []).flatMap(
    ({ leaflet, block, permission_tokens: token }) => {
      if (!token) return [];
      const inPublication = token.leaflets_in_publications[0];
      if (inPublication?.archived || inPublication?.doc) return [];
      if (token.leaflets_to_documents.some((d) => d.document)) return [];
      const pub = inPublication?.publications;
      return [
        {
          leaflet,
          title: getLeafletTitle(token) || "Untitled",
          block,
          publication: pub
            ? { uri: pub.uri, record: normalizePublicationRecord(pub.record) }
            : null,
        },
      ];
    },
  );
}

export const replyBlocksOf = (document: NormalizedDocument | null) =>
  findDocumentBlocks<PubLeafletBlocksReply.Main>(
    document,
    ids.PubLeafletBlocksReply,
  );

export type ReplyTarget = {
  uri: string;
  title: string;
  href: string;
  publication: { name: string; icon: string | null } | null;
  authorHandle: string | null;
  authorAvatar: string | null;
  replyUri: string | null;
  pending: boolean;
};

type ReplyTargetDocument = {
  uri: string;
  data: Json;
  documents_in_publications: {
    publications: { uri: string; record: Json | null } | null;
  }[];
};

function replyTarget(
  doc: ReplyTargetDocument,
  profiles: Awaited<ReturnType<typeof getProfiles>>,
  reply: Pick<ReplyTarget, "replyUri" | "pending">,
): ReplyTarget | null {
  const record = normalizeDocumentRecord(doc.data, doc.uri);
  if (!record) return null;
  const pub = doc.documents_in_publications[0]?.publications;
  const pubRecord = pub ? normalizePublicationRecord(pub.record) : null;
  const author = profiles.get(new AtUri(doc.uri).host);
  return {
    uri: doc.uri,
    title: record.title || "Untitled",
    href: getDocumentURL(record, doc.uri, pub),
    publication:
      pub && pubRecord
        ? {
            name: pubRecord.name,
            icon: pubRecord.icon
              ? blobRefToSrc(pubRecord.icon.ref, new AtUri(pub.uri).host)
              : null,
          }
        : null,
    authorHandle: author?.handle ?? null,
    authorAvatar: author?.avatar ?? null,
    ...reply,
  };
}

// A document's submissions as a reply, each with the document it replies to:
// the embed getPostPageData selects.
type ReplySubmission = {
  uri: string;
  subject: string;
  documents: ReplyTargetDocument | null;
};

async function submissionTargets(
  submissions: ReplySubmission[],
  includePending: boolean,
): Promise<ReplyTarget[]> {
  if (submissions.length === 0) return [];
  const [{ data: allowedRows }, profiles] = await Promise.all([
    supabaseServerClient
      .from("document_reply_visibility")
      .select("reply")
      .in(
        "subject",
        submissions.map((s) => s.subject),
      )
      .in(
        "reply",
        submissions.map((s) => s.uri),
      ),
    getProfiles(submissions.map((s) => new AtUri(s.subject).host)),
  ]);
  const allowed = new Set((allowedRows ?? []).map((r) => r.reply));
  return submissions.flatMap((s) => {
    const pending = !allowed.has(s.uri);
    if (!s.documents || (pending && !includePending)) return [];
    const target = replyTarget(s.documents, profiles, {
      replyUri: s.uri,
      pending,
    });
    return target ? [target] : [];
  });
}

// The documents that show a document as an accepted reply.
export function acceptedReplyTargets(
  submissions: ReplySubmission[],
): Promise<ReplyTarget[]> {
  return submissionTargets(submissions, false);
}

export async function documentReplyTargets(
  document: string,
  viewer: string | null | Promise<string | null>,
): Promise<ReplyTarget[]> {
  const [{ data: submissions }, viewerDid] = await Promise.all([
    supabaseServerClient
      .from("document_replies")
      .select(
        `uri, subject, document_reply_rejections(reply),
        documents!document_replies_subject_fkey(uri, data,
          documents_in_publications(publications(uri, record)))`,
      )
      .eq("document", document),
    viewer,
  ]);
  return submissionTargets(
    (submissions ?? []).filter((s) => !s.document_reply_rejections),
    !!viewerDid && isDocumentOwner(document, viewerDid),
  );
}

// The reply block on published document `subject` that a submission through
// block `key` lands on, or null if the document takes no replies: without
// this check anyone could notify the author of a post that never asked for
// them.
export async function subjectReplyBlock(
  subject: string,
  key: string | null | undefined,
): Promise<PubLeafletBlocksReply.Main | null> {
  const { data: doc } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .eq("uri", subject)
    .maybeSingle();
  return resolveInteractionBlock(
    replyBlocksOf(doc && normalizeDocumentRecord(doc.data, doc.uri)),
    key,
  );
}

// The post a reply draft answers, for the editor's "Replying to" indicator.
export async function getReplyTarget(
  subject: string,
): Promise<ReplyTarget | null> {
  const [{ data: doc }, profiles] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("uri, data, documents_in_publications(publications(uri, record))")
      .eq("uri", subject)
      .maybeSingle(),
    getProfiles([new AtUri(subject).host]),
  ]);
  return doc && replyTarget(doc, profiles, { replyUri: null, pending: true });
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
  // Key of the reply block submitted through
  block: string | undefined;
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
    block: args.block,
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
