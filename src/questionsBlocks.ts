import { AtUri } from "@atproto/syntax";
import { AtpAgent } from "@atproto/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PubLeafletBlocksQuestions,
  PubLeafletInteractionsQuestionVisibility,
} from "lexicons/api";
import type { Database } from "supabase/database.types";
import { ids } from "lexicons/api/lexicons";
import type { NormalizedDocument } from "src/utils/normalizeRecords";
import { findDocumentBlocks } from "src/utils/documentHasBlock";
import type { QuestionsAudience } from "src/questionsAudience";
import { deriveSubscriptionState } from "src/subscriptions/state";
import type { QuestionState } from "src/documentQuestions";

export const questionsBlocksOf = (document: NormalizedDocument | null) =>
  findDocumentBlocks<PubLeafletBlocksQuestions.Main>(
    document,
    ids.PubLeafletBlocksQuestions,
  );

export async function canAskQuestion(
  supabase: SupabaseClient<Database>,
  subject: string,
  asker: string,
  audience: QuestionsAudience,
): Promise<boolean> {
  if (audience === "anyone") return true;
  const author = new AtUri(subject).host;
  if (author === asker) return true;
  if (audience === "subscribers")
    return isPublicationSubscriber(supabase, subject, asker);
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  const res = await agent.app.bsky.graph.getRelationships({
    actor: author,
    others: [asker],
  });
  const rel = res.data.relationships.find(
    (r) => r.$type === "app.bsky.graph.defs#relationship",
  ) as { following?: string; followedBy?: string } | undefined;
  if (!rel) return false;
  return audience === "follows" ? !!rel.following : !!rel.followedBy;
}

async function isPublicationSubscriber(
  supabase: SupabaseClient<Database>,
  subject: string,
  did: string,
) {
  const { data: inPublication } = await supabase
    .from("documents_in_publications")
    .select("publication")
    .eq("document", subject)
    .limit(1);
  const publication = inPublication?.[0]?.publication;
  if (!publication) return false;
  const { data: identities } = await supabase
    .from("identities")
    .select(
      `publication_subscriptions(publication),
       publication_email_subscribers(publication, state),
       publication_memberships(publication, tier, status, current_period_end)`,
    )
    .eq("atp_did", did)
    .eq("publication_subscriptions.publication", publication)
    .eq("publication_email_subscribers.publication", publication)
    .eq("publication_memberships.publication", publication);
  return (identities ?? []).some(
    (identity) =>
      deriveSubscriptionState(publication, {
        subscriptions: identity.publication_subscriptions,
        emailSubscribers: identity.publication_email_subscribers,
        memberships: identity.publication_memberships,
      }).subscribed,
  );
}

// Hidden wins over accepted if a question is somehow in both.
export function questionVisibilityStates(
  record: PubLeafletInteractionsQuestionVisibility.Record,
) {
  return new Map<string, QuestionState>([
    ...record.accepted.map((q) => [q, "accepted"] as const),
    ...record.hidden.map((q) => [q, "hidden"] as const),
  ]);
}

// Replaces the subject's rows wholesale so cleared states don't linger. Both
// the app and the appview write them, so a row may land between the delete
// and the upsert.
export async function mirrorQuestionVisibility(
  supabase: SupabaseClient<Database>,
  uri: string,
  subject: string,
  states: Map<string, QuestionState>,
) {
  await supabase
    .from("document_question_visibility")
    .delete()
    .eq("subject", subject);
  if (states.size === 0) return;
  const { error } = await supabase.from("document_question_visibility").upsert(
    [...states].map(([question, state]) => ({
      uri,
      subject,
      question,
      state,
    })),
  );
  if (error) console.error("[questions] visibility row upsert failed", error);
}
