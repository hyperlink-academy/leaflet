"use server";

import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
import { XRPCError } from "@atproto/xrpc";
import { v7 } from "uuid";
import {
  PubLeafletInteractionsAnswer,
  PubLeafletInteractionsQuestionVisibility,
  PubLeafletInteractionsQuestion,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import { OAuthSessionError } from "src/atproto-oauth";
import { agentFor, notAuthenticated } from "src/utils/agentFor";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import { getAuthIdentity } from "src/auth";
import { Err, Ok, Result } from "src/result";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { resolveInteractionBlock } from "src/utils/documentHasBlock";
import { questionsAudience } from "src/questionsAudience";
import {
  canAskQuestion,
  mirrorQuestionVisibility,
  questionsBlocksOf,
  questionVisibilityStates,
} from "src/questionsBlocks";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import {
  answerRkey,
  loadDocumentQuestions,
  type DocumentQuestions,
  type QuestionState,
} from "src/documentQuestions";
import { scanIndexLocal } from "src/replicache/utils";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { processBlocksToPages } from "src/utils/factsToPagesRecord";
import { makePublishUploadHooks } from "src/utils/publishHelpers";
import { revalidateDocumentPaths } from "src/utils/revalidatePublication";
import { broadcastDocumentEvent } from "src/documentEvents/broadcast";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";

async function notify(recipient: string, data: Notification["data"]) {
  const notification: Notification = { id: v7(), recipient, data };
  await supabaseServerClient.from("notifications").insert(notification);
  await pingIdentityToUpdateNotification(recipient);
}

export async function getDocumentQuestions(
  subject: string,
): Promise<DocumentQuestions> {
  const identity = await getAuthIdentity();
  return loadDocumentQuestions(subject, identity?.atp_did ?? null);
}

export type QuestionError =
  | {
      type:
        | "not_found"
        | "empty"
        | "questions_closed"
        | "not_follows"
        | "not_follower"
        | "not_owner"
        | "failed";
    }
  | OAuthSessionError;

// Asks the author of `subject` a public question.
export async function askQuestion(args: {
  subject: string;
  // Key of the questions block asked through
  block: string | null;
  plaintext: string;
  facets: PubLeafletRichtextFacet.Main[];
}): Promise<Result<{ uri: string }, QuestionError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const did = identity.atp_did;
  if (!args.plaintext.trim()) return Err({ type: "empty" });

  const { data: subjectDoc } = await supabaseServerClient
    .from("documents")
    .select("uri, data")
    .eq("uri", args.subject)
    .maybeSingle();
  if (!subjectDoc) return Err({ type: "not_found" });
  // Without this anyone could notify the author of a post that never asked
  // for questions.
  const subjectRecord = normalizeDocumentRecord(
    subjectDoc.data,
    subjectDoc.uri,
  );
  const questionsBlock = resolveInteractionBlock(
    questionsBlocksOf(subjectRecord),
    args.block,
  );
  if (!questionsBlock) return Err({ type: "questions_closed" });
  const audience = questionsAudience(questionsBlock.audience);
  try {
    if (!(await canAskQuestion(args.subject, did, audience)))
      return Err({
        type: audience === "follows" ? "not_follows" : "not_follower",
      });
  } catch (e) {
    console.error("[questions] follow check failed", e);
    return Err({ type: "failed" });
  }

  const agent = await agentFor(did);
  if (!agent.ok) return Err(agent.error);

  const record: PubLeafletInteractionsQuestion.Record = {
    $type: "pub.leaflet.interactions.question",
    subject: args.subject,
    block: questionsBlock.key,
    plaintext: args.plaintext,
    facets: args.facets.length > 0 ? args.facets : undefined,
    createdAt: new Date().toISOString(),
  };
  if (!PubLeafletInteractionsQuestion.validateRecord(record).success)
    return Err({ type: "failed" });
  const collection = ids.PubLeafletInteractionsQuestion;
  const rkey = TID.nextStr();
  const uri = AtUri.make(did, collection, rkey).toString();
  let cid: string;
  try {
    const created = await agent.value.com.atproto.repo.createRecord({
      repo: did,
      collection,
      rkey,
      record,
      validate: false,
    });
    cid = created.data.cid;
  } catch (e) {
    console.error("[questions] createRecord failed", e);
    return Err({ type: "failed" });
  }
  const { error } = await supabaseServerClient
    .from("document_questions")
    .upsert({
      uri,
      subject: args.subject,
      asker_did: did,
      cid,
      record: record as unknown as Json,
    });
  if (error) {
    console.error("[questions] row upsert failed", error);
    return Err({ type: "failed" });
  }

  await broadcastDocumentEvent(supabaseServerClient, "question", args.subject);
  const subjectOwner = new AtUri(args.subject).host;
  if (subjectOwner !== did)
    await notify(subjectOwner, {
      type: "post_question",
      question_uri: uri,
      document_uri: args.subject,
    });
  return Ok({ uri });
}

export async function withdrawQuestion(
  questionUri: string,
): Promise<Result<null, QuestionError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  let uri: AtUri;
  try {
    uri = new AtUri(questionUri);
  } catch {
    return Err({ type: "not_owner" });
  }
  if (
    uri.host !== identity.atp_did ||
    uri.collection !== ids.PubLeafletInteractionsQuestion
  )
    return Err({ type: "not_owner" });

  const agent = await agentFor(identity.atp_did);
  if (!agent.ok) return Err(agent.error);
  // Read before the record goes: the appview may delete the row first.
  const { data: row } = await supabaseServerClient
    .from("document_questions")
    .select("subject")
    .eq("uri", questionUri)
    .maybeSingle();
  try {
    await agent.value.com.atproto.repo.deleteRecord({
      repo: uri.host,
      collection: uri.collection,
      rkey: uri.rkey,
    });
  } catch (e) {
    console.error("[questions] deleteRecord failed", e);
    return Err({ type: "failed" });
  }
  await supabaseServerClient
    .from("document_questions")
    .delete()
    .eq("uri", questionUri);
  if (row) {
    await broadcastDocumentEvent(supabaseServerClient, "question", row.subject);
    // A shown question was server-rendered into the post's pages.
    await revalidateDocumentPaths(row.subject, { neighbours: false });
  }
  return Ok(null);
}

// Publishes the answer drafted under `answerEntity` in the leaflet as the
// one pub.leaflet.interactions.answer record for its question, in the repo
// that owns the published document. Re-publishing overwrites it.
export async function publishAnswer(args: {
  leaflet_id: string;
  answerEntity: string;
}): Promise<Result<{ uri: string }, QuestionError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  const actor = identity.atp_did;

  const { data: token } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      "root_entity, leaflets_in_publications(doc), leaflets_to_documents(document)",
    )
    .eq("id", args.leaflet_id)
    .maybeSingle();
  if (!token) return Err({ type: "not_found" });
  const inPublication = token.leaflets_in_publications[0];
  const subject =
    inPublication?.doc || token.leaflets_to_documents[0]?.document;
  // Readers can only ask once the document is published, so an unpublished
  // draft has nothing to answer.
  if (!subject) return Err({ type: "not_found" });
  // Answers are the author's alone: the record is written in the repo that
  // owns the post.
  if (!isDocumentOwner(subject, actor)) return Err({ type: "not_owner" });

  const { data: factRows } = await supabaseServerClient.rpc("get_facts", {
    root: token.root_entity,
  });
  const facts = (factRows as unknown as Fact<Attribute>[]) || [];
  const scan = scanIndexLocal(facts);
  const [questionFact] = scan.eav(args.answerEntity, "answer/question");
  if (!questionFact) return Err({ type: "not_found" });
  const questionUri = questionFact.data.value;
  const { data: question } = await supabaseServerClient
    .from("document_questions")
    .select("uri, cid, subject, asker_did, document_question_answers(record)")
    .eq("uri", questionUri)
    .maybeSingle();
  if (!question || question.subject !== subject)
    return Err({ type: "not_found" });

  const agent = await agentFor(actor);
  if (!agent.ok) return Err(agent.error);

  const { pages } = await processBlocksToPages({
    facts,
    root_entity: token.root_entity,
    start_page: args.answerEntity,
    hooks: makePublishUploadHooks(agent.value, actor),
  });
  const page = pages[0];
  if (!page || !PubLeafletPagesLinearDocument.isMain(page))
    return Err({ type: "failed" });
  if (page.blocks.length === 0) return Err({ type: "empty" });
  // The page id is the draft entity, which means nothing outside the leaflet.
  const { id: _entity, ...content } = page;

  const existing = question.document_question_answers
    ?.record as PubLeafletInteractionsAnswer.Record | null;
  const record: PubLeafletInteractionsAnswer.Record = {
    $type: "pub.leaflet.interactions.answer",
    question: { uri: questionUri, cid: question.cid },
    document: subject,
    content: { ...content, $type: "pub.leaflet.pages.linearDocument" },
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const collection = ids.PubLeafletInteractionsAnswer;
  const rkey = answerRkey(questionUri);
  const uri = AtUri.make(actor, collection, rkey).toString();
  try {
    await agent.value.com.atproto.repo.putRecord({
      repo: actor,
      collection,
      rkey,
      record,
      validate: false,
    });
  } catch (e) {
    console.error("[questions] answer putRecord failed", e);
    return Err({ type: "failed" });
  }
  const { error } = await supabaseServerClient
    .from("document_question_answers")
    .upsert({
      uri,
      question: questionUri,
      subject,
      record: record as unknown as Json,
    });
  if (error) {
    console.error("[questions] answer row upsert failed", error);
    return Err({ type: "failed" });
  }

  if (!existing && question.asker_did !== actor)
    await notify(question.asker_did, {
      type: "question_answered",
      question_uri: questionUri,
      document_uri: subject,
    });
  await broadcastDocumentEvent(supabaseServerClient, "answer", subject);
  // The post's page lists its answered questions.
  await revalidateDocumentPaths(subject, { neighbours: false });
  return Ok({ uri });
}

// Accepts, hides or returns to pending one question on the viewer's own
// document. The states live in one pub.leaflet.interactions.questionVisibility
// record in the document's repo, keyed by the document's rkey so every change
// is a plain overwrite; the supabase rows mirror what the appview indexes
// from it.
export async function setQuestionState(args: {
  subject: string;
  question: string;
  state: QuestionState;
}): Promise<Result<null, QuestionError>> {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err(notAuthenticated);
  if (!isDocumentOwner(args.subject, identity.atp_did))
    return Err({ type: "not_owner" });

  const agent = await agentFor(identity.atp_did);
  if (!agent.ok) return Err(agent.error);
  const subjectUri = new AtUri(args.subject);
  const repo = subjectUri.host;
  const collection = ids.PubLeafletInteractionsQuestionVisibility;
  const rkey = subjectUri.rkey;

  // Built from the record rather than the mirrored rows: the appview rewrites
  // the rows from each record event, which can land after a newer change.
  let marks = new Map<string, QuestionState>();
  try {
    const { data } = await agent.value.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });
    const record = PubLeafletInteractionsQuestionVisibility.validateRecord(
      data.value,
    );
    if (record.success) marks = questionVisibilityStates(record.value);
  } catch (e) {
    if (!(e instanceof XRPCError && e.error === "RecordNotFound")) {
      console.error("[questions] visibility read failed", e);
      return Err({ type: "failed" });
    }
  }
  marks.delete(args.question);
  if (args.state !== "pending") marks.set(args.question, args.state);

  // Withdrawn questions drop out of the lists here, so they can't grow
  // without bound.
  const { data: existing, error: readError } = await supabaseServerClient
    .from("document_questions")
    .select("uri")
    .eq("subject", args.subject)
    .in("uri", [...marks.keys()]);
  if (readError) {
    console.error("[questions] question read failed", readError);
    return Err({ type: "failed" });
  }
  const live = new Set(existing.map((r) => r.uri));
  if (args.state !== "pending" && !live.has(args.question))
    return Err({ type: "not_found" });
  for (const q of marks.keys()) if (!live.has(q)) marks.delete(q);
  const listOf = (state: QuestionState) =>
    [...marks].filter(([, s]) => s === state).map(([q]) => q);

  try {
    if (marks.size === 0) {
      await agent.value.com.atproto.repo
        .deleteRecord({ repo, collection, rkey })
        .catch(() => {});
    } else {
      const record: PubLeafletInteractionsQuestionVisibility.Record = {
        $type: "pub.leaflet.interactions.questionVisibility",
        subject: args.subject,
        accepted: listOf("accepted"),
        hidden: listOf("hidden"),
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
    console.error("[questions] visibility write failed", e);
    return Err({ type: "failed" });
  }

  // Mirror the record now rather than waiting on the appview.
  await mirrorQuestionVisibility(
    supabaseServerClient,
    AtUri.make(repo, collection, rkey).toString(),
    args.subject,
    marks,
  );
  await broadcastDocumentEvent(supabaseServerClient, "question", args.subject);
  // Shown questions are server-rendered into the post's pages.
  await revalidateDocumentPaths(args.subject, { neighbours: false });
  return Ok(null);
}
