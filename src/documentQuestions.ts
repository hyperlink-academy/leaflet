import { AtUri } from "@atproto/syntax";
import type {
  PubLeafletInteractionsAnswer,
  PubLeafletInteractionsQuestion,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { getProfiles, type Profile } from "src/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { isDocumentOwner } from "src/utils/isDocumentOwner";

const MAX_QUESTIONS = 500;

export type DocumentQuestion = {
  // at-uri of the pub.leaflet.interactions.question record
  uri: string;
  // Asked by the viewer
  mine: boolean;
  asker: Pick<Profile, "did" | "handle" | "displayName" | "avatar">;
  plaintext: string;
  facets?: PubLeafletRichtextFacet.Main[];
  createdAt: string;
  // The author's published answer
  answer: { uri: string; content: PubLeafletPagesLinearDocument.Main } | null;
};

export type DocumentQuestions = {
  // The viewer owns the document and answers its questions
  isAuthor: boolean;
  questions: DocumentQuestion[];
};

// One answer per question, keyed so re-publishing overwrites: the question's
// rkey plus its repo, which together identify the question.
export function answerRkey(questionUri: string) {
  const uri = new AtUri(questionUri);
  return `${uri.rkey}-${uri.host.replace(/[^A-Za-z0-9._:~-]/g, "")}`;
}

// Readers get the answered questions plus their own; the author gets
// everything, unanswered included. A null viewer gets the public list, which
// is what cached pages render.
export async function loadDocumentQuestions(
  subject: string,
  viewer: string | null,
): Promise<DocumentQuestions> {
  const isAuthor = !!viewer && isDocumentOwner(subject, viewer);
  const { data: rows } = await supabaseServerClient
    .from("document_questions")
    .select("uri, asker_did, record, document_question_answers(uri, record)")
    .eq("subject", subject)
    .order("indexed_at", { ascending: true })
    .limit(MAX_QUESTIONS);

  const shown = (rows ?? []).filter(
    (r) =>
      isAuthor ||
      !!r.document_question_answers ||
      (!!viewer && r.asker_did === viewer),
  );
  if (shown.length === 0) return { isAuthor, questions: [] };

  const profiles = await getProfiles([
    ...new Set(shown.map((r) => r.asker_did)),
  ]);

  return {
    isAuthor,
    questions: shown.map((r) => {
      const record = r.record as PubLeafletInteractionsQuestion.Record;
      const profile = profiles.get(r.asker_did);
      const answerRow = r.document_question_answers;
      const answerRecord = answerRow?.record as
        | PubLeafletInteractionsAnswer.Record
        | undefined;
      return {
        uri: r.uri,
        mine: !!viewer && r.asker_did === viewer,
        asker: {
          did: r.asker_did,
          handle: profile?.handle ?? null,
          displayName: profile?.displayName ?? null,
          avatar: profile?.avatar ?? null,
        },
        plaintext: record.plaintext,
        facets: record.facets,
        createdAt: record.createdAt,
        answer:
          answerRow && answerRecord
            ? { uri: answerRow.uri, content: answerRecord.content }
            : null,
      };
    }),
  };
}
