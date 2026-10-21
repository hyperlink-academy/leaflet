import { AtUri } from "@atproto/syntax";
import type {
  PubLeafletInteractionsAnswer,
  PubLeafletInteractionsQuestion,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { getProfiles } from "src/identity";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { resolveInteractionBlock } from "src/utils/documentHasBlock";
import { questionsBlocksOf } from "src/questionsBlocks";
import {
  interactionAuthor,
  type InteractionAuthor,
} from "src/interactionAuthor";
import { supabaseServerClient } from "supabase/serverClient";
import { isDocumentOwner } from "src/utils/isDocumentOwner";

const MAX_QUESTIONS = 500;

// Accepted questions show to every reader, hidden ones to none. Pending ones
// show only on a block that opts into it (showPending). An answer accepts a
// question unless the author hid it.
export type QuestionState = "pending" | "accepted" | "hidden";

export type DocumentQuestion = {
  // at-uri of the pub.leaflet.interactions.question record
  uri: string;
  // Key of the questions block it was asked through (see
  // resolveInteractionBlock); null for a published block without a key
  block: string | null;
  state: QuestionState;
  // Asked by the viewer
  mine: boolean;
  asker: InteractionAuthor;
  plaintext: string;
  facets?: PubLeafletRichtextFacet.Main[];
  createdAt: string;
  // The author's published answer
  answer: {
    uri: string;
    author: InteractionAuthor;
    content: PubLeafletPagesLinearDocument.Main;
  } | null;
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

// Readers get the questions the author accepted or answered, pending ones on
// blocks that show them, and their own; the author gets everything. A null
// viewer gets the public list, which is what cached pages render.
export async function loadDocumentQuestions(
  subject: string,
  viewer: string | null,
): Promise<DocumentQuestions> {
  const isAuthor = !!viewer && isDocumentOwner(subject, viewer);
  const [{ data: rows }, { data: visibilityRows }, { data: doc }] =
    await Promise.all([
      supabaseServerClient
        .from("document_questions")
        .select("uri, asker_did, record, document_question_answers(uri, record)")
        .eq("subject", subject)
        .order("indexed_at", { ascending: true })
        .limit(MAX_QUESTIONS),
      supabaseServerClient
        .from("document_question_visibility")
        .select("question, state")
        .eq("subject", subject),
      supabaseServerClient
        .from("documents")
        .select("uri, data")
        .eq("uri", subject)
        .maybeSingle(),
    ]);
  const blocks = questionsBlocksOf(
    doc && normalizeDocumentRecord(doc.data, doc.uri),
  );
  const marked = new Map(
    (visibilityRows ?? []).map((r) => [r.question, r.state]),
  );

  const shown = (rows ?? []).flatMap((r) => {
    const record = r.record as PubLeafletInteractionsQuestion.Record;
    const block = resolveInteractionBlock(blocks, record.block);
    const mark = marked.get(r.uri);
    const state: QuestionState =
      mark === "hidden"
        ? "hidden"
        : mark === "accepted" || r.document_question_answers
          ? "accepted"
          : "pending";
    const mine = !!viewer && r.asker_did === viewer;
    // A question whose block was deleted is grouped under the first block, but
    // doesn't inherit that block's showPending: it was asked somewhere else.
    const ownBlock = !record.block || block?.key === record.block;
    const visible =
      state === "accepted" ||
      (state === "pending" && ownBlock && !!block?.showPending);
    if (!isAuthor && !mine && !visible) return [];
    return [{ row: r, record, block: block?.key ?? null, state, mine }];
  });
  if (shown.length === 0) return { isAuthor, questions: [] };

  const profiles = await getProfiles([
    ...new Set([
      ...shown.map(({ row }) => row.asker_did),
      new AtUri(subject).host,
    ]),
  ]);

  return {
    isAuthor,
    questions: shown.map(({ row, record, block, state, mine }) => {
      const answerRow = row.document_question_answers;
      const answerRecord = answerRow?.record as
        | PubLeafletInteractionsAnswer.Record
        | undefined;
      return {
        uri: row.uri,
        block,
        state,
        mine,
        asker: interactionAuthor(row.asker_did, profiles),
        plaintext: record.plaintext,
        facets: record.facets,
        createdAt: record.createdAt,
        answer:
          answerRow && answerRecord
            ? {
                uri: answerRow.uri,
                author: interactionAuthor(
                  new AtUri(answerRow.uri).host,
                  profiles,
                ),
                content: answerRecord.content,
              }
            : null,
      };
    }),
  };
}
