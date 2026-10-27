"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Popover } from "components/Popover";
import { Avatar } from "components/Avatar";
import { CloseTiny } from "components/Icons/CloseTiny";
import { InfoSmall } from "components/Icons/InfoSmall";
import { LoginModal } from "components/LoginButton";
import { BaseTextBlock } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import type { FacetedText } from "components/FacetedTextComposer";
import { ComposerPlaceholder } from "components/FacetedTextComposer/ComposerPlaceholder";
import type { DocumentQuestion, QuestionState } from "src/documentQuestions";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import {
  authorDisplayName,
  hasSeveralAuthors,
  InteractionAuthorName,
} from "../InteractionAuthorName";
import { ReplyButtonTextInput } from "../ReplyBlock/RepliesView";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "./constants";
import {
  questionsAudienceNotice,
  type QuestionsAudience,
} from "src/questionsAudience";

export function QuestionsButtonTextInput(props: {
  value: string;
  onCommit: (text: string) => void;
}) {
  return (
    <ReplyButtonTextInput
      {...props}
      label="Ask button text"
      placeholder={DEFAULT_QUESTIONS_BUTTON_TEXT}
    />
  );
}

export function PublicQuestionNotice(props: {
  defaultOpen?: boolean;
  audience?: QuestionsAudience;
  showPending?: boolean;
}) {
  let restriction = questionsAudienceNotice(props.audience ?? "anyone");
  return (
    <Popover
      asChild
      side="top"
      align="end"
      defaultOpen={props.defaultOpen}
      className="max-w-64 text-sm text-secondary"
      trigger={
        <button
          type="button"
          aria-label="About public questions"
          className="text-tertiary hover:text-accent-contrast"
        >
          <InfoSmall />
        </button>
      }
    >
      Questions are public. Yours is posted to your account, where anyone can
      see it,{" "}
      {props.showPending
        ? "and appears here unless the author hides it."
        : "and appears here once the author accepts or answers it."}
      {restriction && <div className="pt-2">{restriction}</div>}
    </Popover>
  );
}

// The restriction readers see beside the composer, if there is one
function AudienceNotice(props: { audience?: QuestionsAudience }) {
  let restriction = questionsAudienceNotice(props.audience ?? "anyone");
  if (!restriction) return null;
  return <span className="text-sm text-tertiary italic">{restriction}</span>;
}

const FacetedTextComposer = dynamic(
  () =>
    import("components/FacetedTextComposer").then((m) => m.FacetedTextComposer),
  { ssr: false, loading: () => <ComposerPlaceholder className="min-h-20!" /> },
);

export function QuestionComposer(props: {
  draftKey: string | null;
  submitLabel?: string;
  autoFocus?: boolean;
  audience?: QuestionsAudience;
  showPending?: boolean;
  onSubmit: (text: FacetedText) => Promise<boolean>;
}) {
  return (
    <FacetedTextComposer
      draftKey={props.draftKey}
      autoFocus={props.autoFocus}
      inputClassName="min-h-20!"
      submitLabel={props.submitLabel || DEFAULT_QUESTIONS_BUTTON_TEXT}
      onSubmit={props.onSubmit}
      trailing={
        <>
          <AudienceNotice audience={props.audience} />
          <PublicQuestionNotice
            audience={props.audience}
            showPending={props.showPending}
          />
        </>
      }
    />
  );
}

// The editor shows readers' input without taking questions.
export function QuestionComposerPreview(props: {
  action: React.ReactNode;
  audience?: QuestionsAudience;
  showPending?: boolean;
}) {
  return (
    <div className="flex flex-col grow">
      <div className="commentInput border input-with-border min-h-20 px-2 py-[6px] text-tertiary italic">
        Readers write their question here…
      </div>
      <div className="flex justify-end items-center gap-2 pt-1">
        <AudienceNotice audience={props.audience} />
        <PublicQuestionNotice
          audience={props.audience}
          showPending={props.showPending}
        />
        {props.action}
      </div>
    </div>
  );
}

// Readers without an Atmosphere account sign in (or link one) before they
// can ask; the same box the comments drawer shows.
export function SignInToAsk(props: {
  // Signed in, but without an Atmosphere account
  linkAccount?: boolean;
  redirectRoute?: string;
  trigger?: React.ReactNode;
}) {
  return (
    <div className="w-full accent-container text-tertiary text-center italic p-3">
      <span className="text-accent-contrast font-bold">
        {props.trigger ?? (
          <LoginModal
            noEmailLogin
            trigger={props.linkAccount ? "Link" : "Log in"}
            redirectRoute={props.redirectRoute}
          />
        )}
      </span>{" "}
      {props.linkAccount ? "" : "with "}an Atmosphere account to ask a question
    </div>
  );
}

export function QuestionsDraft(props: {
  action: React.ReactNode;
  audience?: QuestionsAudience;
  showPending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <QuestionComposerPreview
        action={props.action}
        audience={props.audience}
        showPending={props.showPending}
      />
      <div className="light-container text-sm italic text-tertiary text-center p-3 sm:p-4">
        <div className="text-base font-bold">
          Questions open when you publish
        </div>
        Readers can ask you public questions. Accept one to show it, or answer
        it right here and the answer appears under it.
      </div>
    </div>
  );
}

function QuestionBody(props: {
  question: DocumentQuestion;
  showHandle?: boolean;
  control?: React.ReactNode;
}) {
  let { asker } = props.question;
  return (
    <div className="flex gap-2 min-w-0">
      <Avatar
        src={asker.avatar}
        displayName={authorDisplayName(asker)}
        size="small"
      />
      <div className="flex flex-col min-w-0 grow">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <InteractionAuthorName author={asker} showHandle={props.showHandle} />
          {props.question.createdAt && (
            <span className="text-tertiary shrink-0">
              <LocalizedDate
                dateString={props.question.createdAt}
                omitYear
                options={{ year: "2-digit", month: "short", day: "numeric" }}
              />
            </span>
          )}
          {props.control && (
            <span className="ml-auto shrink-0 flex items-center gap-2 text-tertiary">
              {props.control}
            </span>
          )}
        </div>
        <pre
          style={{ wordBreak: "break-word", fontFamily: "inherit" }}
          className="whitespace-pre-wrap text-primary"
        >
          <BaseTextBlock
            index={[]}
            plaintext={props.question.plaintext}
            facets={props.question.facets}
            ugcLinks
          />
        </pre>
      </div>
    </div>
  );
}

// A question, whatever answers it under it (the published answer, or the
// author's inline editor), and whatever acts on it beside the asker's name.
export function QuestionRow(props: {
  question: DocumentQuestion;
  showHandle?: boolean;
  answer?: React.ReactNode;
  control?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 transparent-container p-2 sm:p-3">
      <QuestionBody
        question={props.question}
        showHandle={props.showHandle}
        control={props.control}
      />
      {props.answer && <div className="pl-8 sm:pl-9">{props.answer}</div>}
    </div>
  );
}

export function AnswerEditorFrame(props: {
  children: React.ReactNode;
  // The question already has a published answer this would replace
  published: boolean;
  // Closing drops the draft
  discardOnClose: boolean;
  publishing?: boolean;
  onPublish: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="answerEditor bg-bg-page border border-border rounded-md py-1">
        {props.children}
      </div>
      <div className="flex justify-end gap-2">
        <ButtonTertiary
          compact
          disabled={props.publishing}
          onClick={props.onCancel}
        >
          {props.discardOnClose ? "Discard" : "Close"}
        </ButtonTertiary>
        <ButtonPrimary
          compact
          disabled={props.publishing}
          onClick={props.onPublish}
        >
          {props.publishing
            ? "Publishing…"
            : props.published
              ? "Update answer"
              : "Publish answer"}
        </ButtonPrimary>
      </div>
    </div>
  );
}

// The reader's view: the questions shown on the post, plus their own still
// waiting.
export function QuestionsList(props: {
  questions: DocumentQuestion[];
  // The composer or a sign-in button
  action?: React.ReactNode;
  renderAnswer: RenderAnswer;
  onWithdraw?: (uri: string) => void;
}) {
  let { onWithdraw } = props;
  return (
    <div className="flex flex-col gap-3">
      {props.action}
      <QuestionRows
        questions={props.questions}
        showHandles={showHandlesFor(props.questions)}
        renderAnswer={props.renderAnswer}
        renderControl={(question) =>
          !question.answer && (
            <>
              <span className="italic">
                {question.mine && question.state !== "accepted"
                  ? "Awaiting the author"
                  : "Awaiting an answer"}
              </span>
              {onWithdraw && question.mine && (
                <button
                  aria-label="Withdraw question"
                  className="hover:text-accent-contrast"
                  onClick={() => onWithdraw(question.uri)}
                >
                  <CloseTiny />
                </button>
              )}
            </>
          )
        }
      />
    </div>
  );
}

// The author's view: pending questions first, each with controls to accept
// or hide it, then the ones shown on the post, and the hidden ones behind a
// toggle.
export function QuestionsModeration(props: {
  questions: DocumentQuestion[];
  // Above the lists: the editor's composer preview
  header?: React.ReactNode;
  // A state change is being published
  busy?: boolean;
  // Unset for an editor who isn't the post's author
  onSetState?: (uri: string, state: QuestionState) => void;
  renderAnswer: RenderAnswer;
  // Beside a question's moderation controls: "Answer", or a link to the
  // editor
  renderControl: (question: DocumentQuestion) => React.ReactNode;
}) {
  let [showHidden, setShowHidden] = useState(false);
  let inState = (state: QuestionState) =>
    props.questions.filter((q) => q.state === state);
  let hidden = inState("hidden");
  if (showHidden && hidden.length === 0) setShowHidden(false);
  let showHandles = showHandlesFor(props.questions);
  let stateButton = (
    q: DocumentQuestion,
    state: QuestionState,
    label: string,
  ) =>
    props.onSetState && (
      <ButtonTertiary
        compact
        disabled={props.busy}
        onClick={() => props.onSetState?.(q.uri, state)}
      >
        {label}
      </ButtonTertiary>
    );
  let rows = (
    questions: DocumentQuestion[],
    controls: (q: DocumentQuestion) => React.ReactNode,
    className?: string,
  ) => (
    <QuestionRows
      questions={questions}
      className={className}
      showHandles={showHandles}
      renderAnswer={props.renderAnswer}
      renderControl={(q) => (
        <>
          {controls(q)}
          {props.renderControl(q)}
        </>
      )}
    />
  );
  return (
    <div className="flex flex-col gap-3">
      {props.header}
      {props.questions.length === 0 && (
        <div className="light-container text-sm italic text-tertiary text-center p-3">
          No one has asked anything yet.
        </div>
      )}
      {rows(
        inState("pending"),
        (q) => (
          <>
            {stateButton(q, "hidden", "Hide")}
            {stateButton(q, "accepted", "Accept")}
          </>
        ),
        "light-container p-2",
      )}
      {rows(inState("accepted"), (q) => stateButton(q, "hidden", "Hide"))}
      {hidden.length > 0 && (
        <div className="flex flex-col gap-2">
          <ButtonTertiary
            compact
            className="w-fit"
            aria-expanded={showHidden}
            onClick={() => setShowHidden(!showHidden)}
          >
            {hidden.length} hidden
            <ArrowDownTiny className={showHidden ? "rotate-180" : ""} />
          </ButtonTertiary>
          {showHidden &&
            rows(hidden, (q) => stateButton(q, "pending", "Unhide"))}
        </div>
      )}
    </div>
  );
}

// Whether to show handles, judged across everyone the whole list shows: the
// askers and whoever answered.
function showHandlesFor(questions: DocumentQuestion[]) {
  return hasSeveralAuthors(
    questions.flatMap((q) =>
      q.answer ? [q.asker, q.answer.author] : [q.asker],
    ),
  );
}

type RenderAnswer = (
  question: DocumentQuestion,
  showHandle?: boolean,
) => React.ReactNode;

function QuestionRows(props: {
  questions: DocumentQuestion[];
  className?: string;
  showHandles?: boolean;
  renderAnswer: RenderAnswer;
  renderControl: (question: DocumentQuestion) => React.ReactNode;
}) {
  if (props.questions.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2 ${props.className ?? ""}`}>
      {props.questions.map((question) => (
        <QuestionRow
          key={question.uri}
          question={question}
          showHandle={props.showHandles}
          answer={props.renderAnswer(question, props.showHandles)}
          control={props.renderControl(question)}
        />
      ))}
    </div>
  );
}
