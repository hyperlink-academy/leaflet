"use client";
import React from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Popover } from "components/Popover";
import { Avatar } from "components/Avatar";
import { CloseTiny } from "components/Icons/CloseTiny";
import { InfoSmall } from "components/Icons/InfoSmall";
import { LoginModal } from "components/LoginButton";
import { BaseTextBlock } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import {
  FacetedTextComposer,
  type FacetedText,
} from "components/FacetedTextComposer";
import type { DocumentQuestion } from "src/documentQuestions";
import { ReplyButtonTextInput } from "../ReplyBlock/RepliesView";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "./constants";

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

export function PublicQuestionNotice(props: { defaultOpen?: boolean }) {
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
      see it, and appears here if the author answers it.
    </Popover>
  );
}

export function QuestionComposer(props: {
  draftKey: string | null;
  submitLabel?: string;
  autoFocus?: boolean;
  onSubmit: (text: FacetedText) => Promise<boolean>;
}) {
  return (
    <FacetedTextComposer
      draftKey={props.draftKey}
      autoFocus={props.autoFocus}
      inputClassName="min-h-20!"
      submitLabel={props.submitLabel || DEFAULT_QUESTIONS_BUTTON_TEXT}
      onSubmit={props.onSubmit}
      trailing={<PublicQuestionNotice />}
    />
  );
}

// The editor shows readers' input without taking questions.
export function QuestionComposerPreview(props: { action: React.ReactNode }) {
  return (
    <div className="flex flex-col grow">
      <div className="commentInput border input-with-border min-h-20 px-2 py-[6px] text-tertiary italic">
        Readers write their question here…
      </div>
      <div className="flex justify-end items-center gap-2 pt-1">
        <PublicQuestionNotice />
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

export function QuestionsDraft(props: { action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <QuestionComposerPreview action={props.action} />
      <div className="light-container text-sm italic text-tertiary text-center p-3 sm:p-4">
        <div className="text-base font-bold">
          Questions open when you publish
        </div>
        Readers can ask you public questions. Answer one right here and it
        appears under the question.
      </div>
    </div>
  );
}

function QuestionBody(props: {
  question: DocumentQuestion;
  control?: React.ReactNode;
}) {
  let { asker } = props.question;
  let name = asker.displayName || asker.handle || "Someone";
  return (
    <div className="flex gap-2 min-w-0">
      <Avatar src={asker.avatar} displayName={name} size="small" />
      <div className="flex flex-col min-w-0 grow">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="font-bold text-secondary truncate">{name}</span>
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
  answer?: React.ReactNode;
  control?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 transparent-container p-2 sm:p-3">
      <QuestionBody question={props.question} control={props.control} />
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

// The reader's view: answered questions, plus their own still waiting.
export function QuestionsList(props: {
  questions: DocumentQuestion[];
  // The composer or a sign-in button
  action?: React.ReactNode;
  renderAnswer: (question: DocumentQuestion) => React.ReactNode;
  onWithdraw?: (uri: string) => void;
}) {
  let { onWithdraw } = props;
  return (
    <div className="flex flex-col gap-3">
      {props.action}
      <QuestionRows
        questions={props.questions}
        renderAnswer={props.renderAnswer}
        renderControl={(question) =>
          !question.answer && (
            <>
              <span className="italic">Awaiting an answer</span>
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

// The author's view: unanswered questions first, each with an answer
// control, and the answered ones under them.
export function QuestionsModeration(props: {
  questions: DocumentQuestion[];
  // Above the lists: the editor's composer preview
  header?: React.ReactNode;
  renderAnswer: (question: DocumentQuestion) => React.ReactNode;
  // Top-right of an unanswered question: "Answer", or a link to the editor
  renderControl: (question: DocumentQuestion) => React.ReactNode;
}) {
  let pending = props.questions.filter((q) => !q.answer);
  let answered = props.questions.filter((q) => q.answer);
  return (
    <div className="flex flex-col gap-3">
      {props.header}
      {props.questions.length === 0 && (
        <div className="light-container text-sm italic text-tertiary text-center p-3">
          No one has asked anything yet.
        </div>
      )}
      <QuestionRows
        questions={pending}
        className="light-container p-2"
        renderAnswer={props.renderAnswer}
        renderControl={props.renderControl}
      />
      <QuestionRows
        questions={answered}
        renderAnswer={props.renderAnswer}
        renderControl={props.renderControl}
      />
    </div>
  );
}

function QuestionRows(props: {
  questions: DocumentQuestion[];
  className?: string;
  renderAnswer: (question: DocumentQuestion) => React.ReactNode;
  renderControl: (question: DocumentQuestion) => React.ReactNode;
}) {
  if (props.questions.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2 ${props.className ?? ""}`}>
      {props.questions.map((question) => (
        <QuestionRow
          key={question.uri}
          question={question}
          answer={props.renderAnswer(question)}
          control={props.renderControl(question)}
        />
      ))}
    </div>
  );
}
