"use server";

import { getAuthIdentity } from "src/auth";
import type {
  PendingPublicationActionKind,
  PublicationsWithPendingActions,
} from "src/pendingPublicationActionKinds";
import { supabaseServerClient } from "supabase/serverClient";

function ownedPublicationInteractions(did: string) {
  return supabaseServerClient
    .from("publications")
    .select(
      `uri,
      documents_in_publications(document,
        documents(
          document_replies!document_replies_subject_fkey(uri),
          document_reply_visibility(reply),
          document_reply_rejections(reply),
          document_questions!document_questions_subject_fkey(uri,
            document_question_answers(uri)),
          document_question_visibility(question)))`,
    )
    .eq("identity_did", did);
}

type DocumentInteractions = NonNullable<
  NonNullable<
    Awaited<ReturnType<typeof ownedPublicationInteractions>>["data"]
  >[number]["documents_in_publications"][number]["documents"]
>;

const counters: Record<
  PendingPublicationActionKind,
  (document: DocumentInteractions) => number
> = {
  replies: (document) => {
    const decided = new Set(
      [
        ...document.document_reply_visibility,
        ...document.document_reply_rejections,
      ].map((r) => r.reply),
    );
    return document.document_replies.filter((r) => !decided.has(r.uri)).length;
  },
  questions: (document) => {
    const decided = new Set(
      document.document_question_visibility.map((r) => r.question),
    );
    return document.document_questions.filter(
      (q) => !q.document_question_answers && !decided.has(q.uri),
    ).length;
  },
};

const kinds = Object.keys(counters) as PendingPublicationActionKind[];

export async function getMyPendingPublicationActions(): Promise<PublicationsWithPendingActions> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return {};
  const { data: publications } = await ownedPublicationInteractions(
    identity.atp_did,
  );
  const actions: PublicationsWithPendingActions = {};
  for (const publication of publications ?? [])
    for (const { document, documents } of publication.documents_in_publications)
      for (const kind of kinds) {
        const n = documents ? counters[kind](documents) : 0;
        if (n > 0)
          ((actions[publication.uri] ??= {})[document] ??= {})[kind] = n;
      }
  return actions;
}
