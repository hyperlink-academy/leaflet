"use client";
import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { AtUri } from "@atproto/syntax";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import { usePathname } from "next/navigation";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { useActionToast } from "components/useActionToast";
import { usePostEditLink } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/usePostEditLink";
import {
  askQuestion,
  editQuestion,
  getDocumentQuestions,
  setQuestionState,
  withdrawQuestion,
  type QuestionError,
} from "actions/questions";
import type {
  DocumentQuestion,
  DocumentQuestions as DocumentQuestionsData,
  QuestionState,
} from "src/documentQuestions";
import type { QuestionsAudience } from "src/questionsAudience";
import type { InteractionAuthor } from "src/interactionAuthor";
import { useDocumentEvents } from "src/documentEvents/useDocumentEvents";
import { ComposerPlaceholder } from "components/Composer";
import {
  QuestionAction,
  QuestionAnswer,
  QuestionComposer,
  QuestionComposerPreview,
  QuestionsList,
  QuestionsModeration,
  SignInToAsk,
} from "./QuestionsView";
import { PublishedAnswer } from "./PublishedAnswer";
import type { FacetedText } from "components/Composer/facetedText";
import {
  LimitedLeafletEditor,
  useAnswerDrafts,
  useStartAnswer,
} from "./LimitedLeafletEditor";

const questionErrorMessages: Partial<Record<QuestionError["type"], string>> = {
  not_found: "We couldn't find that post.",
  empty: "Write a question first.",
  questions_closed: "This post isn't taking questions.",
  not_follows: "Only people the author follows can ask here.",
  not_follower: "Only the author's followers can ask here.",
  answered: "This question has been answered, so it can't be edited.",
};

// Questions on a published document, for whoever is looking: the document's
// author answers them, everyone else reads the answered ones and can ask
// their own. `editor` is set by the questions block in the editor, where
// the author answers inline; on the published page the author is sent to
// the editor instead. `initialQuestions` is the public list a cached page
// was rendered with; a signed-in viewer's own view (unanswered questions,
// their own pending ones) replaces it once their identity is known.
export function DocumentQuestions(props: {
  documentUri: string;
  // Key of the questions block this is (see resolveInteractionBlock): only
  // its questions show, and new ones are asked through it
  block: string | null;
  showPending?: boolean;
  // The page was opened at this block
  autoFocus?: boolean;
  initialQuestions?: DocumentQuestion[];
  buttonText?: string;
  audience?: QuestionsAudience;
  editor?: {
    // The questions block entity, whose answer drafts hang off it
    blockEntity: string;
    // The page the block is on
    page: string;
    // The editable button text
    action: React.ReactNode;
    // The viewer's questions as loaded with the page, shown until their
    // identity resolves and the first fetch replaces it
    initial?: DocumentQuestionsData;
  };
}) {
  let { identity, identityPending } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  // Shown beside the composer, and on the answer the viewer is writing
  let viewerAuthor: InteractionAuthor | null = viewer
    ? {
        did: viewer,
        handle: identity?.bsky_profiles?.handle ?? null,
        displayName: identity?.bsky_profiles?.record.displayName ?? null,
        avatar: identity?.bsky_profiles?.record.avatar ?? null,
      }
    : null;
  // An anonymous reader of a cached page has nothing to add to the public
  // list it was rendered with, until something happens to it.
  let [changed, setChanged] = useState(false);
  let needsFetch =
    !identityPending && (!!viewer || !props.initialQuestions || changed);
  let { data, mutate } = useSWR(
    needsFetch ? ["document_questions", props.documentUri, viewer] : null,
    () => getDocumentQuestions(props.documentUri),
    {
      fallbackData:
        props.editor?.initial ??
        (props.initialQuestions && {
          isAuthor: false,
          questions: props.initialQuestions,
        }),
    },
  );
  useDocumentEvents(props.documentUri, ["question", "answer"], () => {
    setChanged(true);
    mutate();
  });
  let run = useActionToast<QuestionError>(questionErrorMessages);
  let [busy, setBusy] = useState(false);
  let questions = (data?.questions ?? []).filter(
    (q) => q.block === props.block,
  );
  let setState = async (question: string, state: QuestionState) => {
    setBusy(true);
    let ok = await run(() =>
      setQuestionState({ subject: props.documentUri, question, state }),
    );
    if (ok)
      await mutate(
        (current) =>
          current && {
            ...current,
            questions: current.questions.map((q) =>
              q.uri === question
                ? {
                    ...q,
                    state: state === "pending" && q.answer ? "accepted" : state,
                  }
                : q,
            ),
          },
        { revalidate: false },
      );
    setBusy(false);
  };
  let toaster = useToaster();
  let pathname = usePathname();
  let redirectRoute = useMemo(() => {
    if (typeof window === "undefined") return;
    return new URL(pathname, window.location.origin).toString();
  }, [pathname]);
  let edit = async (uri: string, text: FacetedText) => {
    if (!(await run(() => editQuestion({ uri, ...text })))) return false;
    await mutate(
      (current) =>
        current && {
          ...current,
          questions: current.questions.map((q) =>
            q.uri === uri
              ? {
                  ...q,
                  plaintext: text.plaintext,
                  facets: text.facets.length > 0 ? text.facets : undefined,
                }
              : q,
          ),
        },
      { revalidate: false },
    );
    return true;
  };
  let withdraw = async (uri: string) => {
    if (await run(() => withdrawQuestion(uri)))
      await mutate(
        (current) =>
          current && {
            ...current,
            questions: current.questions.filter((q) => q.uri !== uri),
          },
        { revalidate: false },
      );
  };
  if (props.editor) {
    let editor = props.editor;
    let preview = (
      <QuestionComposerPreview
        action={editor.action}
        audience={props.audience}
        showPending={props.showPending}
      />
    );
    if (!data) return preview;
    return (
      <EditorQuestions
        questions={questions}
        header={preview}
        busy={busy}
        isAuthor={data.isAuthor}
        onSetState={setState}
        blockEntity={editor.blockEntity}
        page={editor.page}
        author={viewerAuthor}
        onPublished={() => mutate()}
      />
    );
  }
  if (!!viewer && isDocumentOwner(props.documentUri, viewer))
    return (
      <PublishedAuthorView
        documentUri={props.documentUri}
        questions={questions}
        busy={busy}
        onSetState={setState}
      />
    );
  if (!data) return null;

  let ask = async (text: FacetedText) => {
    let result = await run(() =>
      askQuestion({
        subject: props.documentUri,
        block: props.block,
        ...text,
      }),
    );
    if (!result) return false;
    await mutate();
    toaster({ content: "Question sent.", type: "success" });
    return true;
  };
  return (
    <QuestionsList
      questions={questions}
      onWithdraw={withdraw}
      onEdit={edit}
      renderAnswer={publishedAnswer}
      action={
        identityPending ? (
          <ComposerPlaceholder className="min-h-20!" />
        ) : viewer ? (
          <QuestionComposer
            asker={viewerAuthor}
            draftKey={`question:${props.documentUri}${props.block ? `:${props.block}` : ""}`}
            submitLabel={props.buttonText}
            audience={props.audience}
            showPending={props.showPending}
            autoFocus={props.autoFocus}
            onSubmit={ask}
          />
        ) : (
          <SignInToAsk linkAccount={!!identity} redirectRoute={redirectRoute} />
        )
      }
    />
  );
}

// On the published post
const publishedAnswer = (q: DocumentQuestion, showHandle?: boolean) =>
  q.answer ? (
    <PublishedAnswer answer={q.answer} showHandle={showHandle} labeled />
  ) : null;

// The author on their published post: answers are written in the editor.
function PublishedAuthorView(props: {
  documentUri: string;
  questions: DocumentQuestion[];
  busy: boolean;
  onSetState: (uri: string, state: QuestionState) => void;
}) {
  let editLink = usePostEditLink(
    props.documentUri,
    new AtUri(props.documentUri).host,
  );
  return (
    <QuestionsModeration
      questions={props.questions}
      busy={props.busy}
      onSetState={props.onSetState}
      renderAnswer={publishedAnswer}
      renderControl={(q) =>
        !q.answer &&
        editLink && (
          <QuestionAction
            primary
            onClick={() => window.location.assign(editLink)}
          >
            Answer in editor
          </QuestionAction>
        )
      }
    />
  );
}

// The author answers in place, editing a question's draft under it. A
// pending question has no published answer, so its draft is always open;
// any other's opens on request, to revise its answer.
function EditorQuestions(props: {
  questions: DocumentQuestion[];
  header: React.ReactNode;
  busy: boolean;
  // Editors who aren't the post's author see the questions, but can't act
  // on them.
  isAuthor: boolean;
  onSetState: (uri: string, state: QuestionState) => void;
  blockEntity: string;
  page: string;
  author: InteractionAuthor | null;
  onPublished: () => Promise<unknown>;
}) {
  let drafts = useAnswerDrafts(props.blockEntity);
  let startAnswer = useStartAnswer(props.blockEntity);
  let [opened, setOpened] = useState<Set<string>>(new Set());
  let close = (uri: string) =>
    setOpened((o) => new Set([...o].filter((u) => u !== uri)));
  let { author } = props;
  let isOpen = (q: DocumentQuestion) =>
    props.isAuthor &&
    (opened.has(q.uri) || (q.state === "pending" && drafts.includes(q.uri)));
  return (
    <QuestionsModeration
      questions={props.questions}
      header={props.header}
      busy={props.busy}
      onSetState={props.isAuthor ? props.onSetState : undefined}
      renderAnswer={(q, showHandle) =>
        isOpen(q) && author ? (
          <QuestionAnswer author={author} showHandle={showHandle}>
            <LimitedLeafletEditor
              blockEntity={props.blockEntity}
              question={q.uri}
              page={props.page}
              onPublished={async () => {
                await props.onPublished();
                close(q.uri);
              }}
              onClose={() => close(q.uri)}
            />
          </QuestionAnswer>
        ) : (
          q.answer && (
            <PublishedAnswer answer={q.answer} showHandle={showHandle} />
          )
        )
      }
      renderControl={(q) => {
        if (!props.isAuthor || isOpen(q)) return null;
        let hasDraft = drafts.includes(q.uri);
        return (
          <QuestionAction
            primary
            onClick={async () => {
              await startAnswer(q.uri);
              setOpened((o) => new Set(o).add(q.uri));
            }}
          >
            {!q.answer
              ? "Answer"
              : hasDraft
                ? "Edit answer"
                : "Write a new answer"}
          </QuestionAction>
        );
      }}
    />
  );
}
