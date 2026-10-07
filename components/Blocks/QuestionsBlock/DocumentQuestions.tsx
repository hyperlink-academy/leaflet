"use client";
import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { AtUri } from "@atproto/syntax";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import { usePathname } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { useActionToast } from "components/useActionToast";
import { usePostEditLink } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/usePostEditLink";
import {
  askQuestion,
  getDocumentQuestions,
  withdrawQuestion,
  type QuestionError,
} from "actions/questions";
import type { DocumentQuestion } from "src/documentQuestions";
import { ComposerPlaceholder } from "components/FacetedTextComposer";
import {
  QuestionComposer,
  QuestionComposerPreview,
  QuestionsList,
  QuestionsModeration,
  SignInToAsk,
} from "./QuestionsView";
import { PublishedAnswer } from "./PublishedAnswer";
import type { FacetedText } from "components/FacetedTextComposer";
import {
  AnswerEditor,
  useHasAnswerDraft,
  useStartAnswer,
} from "./AnswerEditor";

const questionErrorMessages: Partial<Record<QuestionError["type"], string>> = {
  not_found: "We couldn't find that post.",
  empty: "Write a question first.",
  questions_closed: "This post isn't taking questions.",
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
  initialQuestions?: DocumentQuestion[];
  buttonText?: string;
  editor?: {
    // The questions block entity, whose answer drafts hang off it
    blockEntity: string;
    // The page the block is on
    page: string;
    // The editable button text
    action: React.ReactNode;
  };
}) {
  let { identity, identityPending } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  // An anonymous reader of a cached page has nothing to add to the public
  // list it was rendered with.
  let needsFetch = !identityPending && (!!viewer || !props.initialQuestions);
  let { data, mutate } = useSWR(
    needsFetch ? ["document_questions", props.documentUri, viewer] : null,
    () => getDocumentQuestions(props.documentUri),
    {
      fallbackData: props.initialQuestions && {
        isAuthor: false,
        questions: props.initialQuestions,
      },
    },
  );
  // Questions whose inline answer editor is open (editor only), and whether
  // opening it started the draft
  let [editing, setEditing] = useState<Record<string, { fresh: boolean }>>({});
  let closeEditor = (uri: string) =>
    setEditing(({ [uri]: _, ...rest }) => rest);
  let run = useActionToast<QuestionError>(questionErrorMessages);
  let toaster = useToaster();
  let pathname = usePathname();
  let redirectRoute = useMemo(() => {
    if (typeof window === "undefined") return;
    return new URL(pathname, window.location.origin).toString();
  }, [pathname]);
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
    if (!data) return <QuestionComposerPreview action={editor.action} />;
    let isAuthor = data.isAuthor;
    return (
      <QuestionsModeration
        questions={data.questions}
        header={<QuestionComposerPreview action={editor.action} />}
        renderAnswer={(q) =>
          editing[q.uri] ? (
            <AnswerEditor
              blockEntity={editor.blockEntity}
              question={q.uri}
              page={editor.page}
              published={!!q.answer}
              discardOnClose={editing[q.uri].fresh}
              onPublished={async () => {
                await mutate();
                closeEditor(q.uri);
              }}
              onClose={() => closeEditor(q.uri)}
            />
          ) : (
            publishedAnswer(q)
          )
        }
        renderControl={(q) =>
          isAuthor &&
          !editing[q.uri] && (
            <EditorAnswerControl
              question={q}
              blockEntity={editor.blockEntity}
              onOpen={(fresh) =>
                setEditing((e) => ({ ...e, [q.uri]: { fresh } }))
              }
            />
          )
        }
      />
    );
  }
  if (!!viewer && isDocumentOwner(props.documentUri, viewer))
    return (
      <PublishedAuthorView
        documentUri={props.documentUri}
        questions={data?.questions ?? []}
      />
    );
  if (!data) return null;

  let ask = async (text: FacetedText) => {
    let result = await run(() =>
      askQuestion({ subject: props.documentUri, ...text }),
    );
    if (!result) return false;
    await mutate();
    toaster({ content: "Question sent.", type: "success" });
    return true;
  };
  return (
    <QuestionsList
      questions={data.questions}
      onWithdraw={withdraw}
      renderAnswer={publishedAnswer}
      action={
        identityPending ? (
          <ComposerPlaceholder className="min-h-20!" />
        ) : viewer ? (
          <QuestionComposer
            draftKey={`question:${props.documentUri}`}
            submitLabel={props.buttonText}
            onSubmit={ask}
          />
        ) : (
          <SignInToAsk linkAccount={!!identity} redirectRoute={redirectRoute} />
        )
      }
    />
  );
}

const publishedAnswer = (q: DocumentQuestion) =>
  q.answer ? <PublishedAnswer answer={q.answer} /> : null;

// The author on their published post: answers are written in the editor.
function PublishedAuthorView(props: {
  documentUri: string;
  questions: DocumentQuestion[];
}) {
  let editLink = usePostEditLink(
    props.documentUri,
    new AtUri(props.documentUri).host,
  );
  return (
    <QuestionsModeration
      questions={props.questions}
      renderAnswer={publishedAnswer}
      renderControl={(q) =>
        !q.answer &&
        editLink && (
          <ButtonSecondary
            compact
            onClick={() => window.location.assign(editLink)}
          >
            Answer in editor
          </ButtonSecondary>
        )
      }
    />
  );
}

// Opens the inline editor, starting a draft when the question has none.
function EditorAnswerControl(props: {
  question: DocumentQuestion;
  blockEntity: string;
  onOpen: (fresh: boolean) => void;
}) {
  let hasDraft = useHasAnswerDraft(props.blockEntity, props.question.uri);
  let start = useStartAnswer(props.blockEntity);
  return (
    <ButtonPrimary
      compact
      onClick={async () => {
        if (!hasDraft) await start(props.question.uri);
        props.onOpen(!hasDraft);
      }}
    >
      {hasDraft
        ? props.question.answer
          ? "Edit answer"
          : "Continue answer"
        : props.question.answer
          ? "Write a new answer"
          : "Answer"}
    </ButtonPrimary>
  );
}
