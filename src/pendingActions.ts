import { supabaseServerClient } from "supabase/serverClient";
import type { PendingActionKind, PendingActions } from "src/pendingActionKinds";

type PendingCounter = (documents: string[]) => Promise<Map<string, number>>;

const counters: Record<PendingActionKind, PendingCounter> = {
  replies: async (documents) => {
    const [{ data: replies }, { data: accepted }, { data: rejected }] =
      await Promise.all([
        supabaseServerClient
          .from("document_replies")
          .select("uri, subject")
          .in("subject", documents),
        supabaseServerClient
          .from("document_reply_visibility")
          .select("reply")
          .in("subject", documents),
        supabaseServerClient
          .from("document_reply_rejections")
          .select("reply")
          .in("subject", documents),
      ]);
    const decided = new Set(
      [...(accepted ?? []), ...(rejected ?? [])].map((r) => r.reply),
    );
    return countBy(
      (replies ?? []).filter((r) => !decided.has(r.uri)),
      (r) => r.subject,
    );
  },
  questions: async (documents) => {
    const [{ data: questions }, { data: marked }] = await Promise.all([
      supabaseServerClient
        .from("document_questions")
        .select("uri, subject, document_question_answers(uri)")
        .in("subject", documents),
      supabaseServerClient
        .from("document_question_visibility")
        .select("question")
        .in("subject", documents),
    ]);
    const decided = new Set((marked ?? []).map((r) => r.question));
    return countBy(
      (questions ?? []).filter(
        (q) => !q.document_question_answers && !decided.has(q.uri),
      ),
      (q) => q.subject,
    );
  },
};

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return counts;
}

export async function loadPendingActions(
  documents: string[],
): Promise<PendingActions> {
  if (documents.length === 0) return {};
  const kinds = Object.keys(counters) as PendingActionKind[];
  const counts = await Promise.all(kinds.map((k) => counters[k](documents)));
  const actions: PendingActions = {};
  kinds.forEach((kind, i) => {
    for (const [document, n] of counts[i]) {
      if (n > 0) (actions[document] ??= {})[kind] = n;
    }
  });
  return actions;
}
