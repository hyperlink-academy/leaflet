"use client";
import React, { Fragment, useState } from "react";
import { Avatar } from "components/Avatar";
import { Separator } from "components/Layout";
import { LoginModal } from "components/LoginButton";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { BaseTextBlock } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import { ComposerChrome, ComposerSubmit } from "components/Composer";
import { TextComposer } from "components/Composer/TextComposer";
import {
  docToFacetedText,
  facetedTextToDoc,
  type FacetedText,
} from "components/Composer/facetedText";
import type { DocumentQuestion, QuestionState } from "src/documentQuestions";
import type { InteractionAuthor } from "src/interactionAuthor";
import {
  authorDisplayName,
  hasSeveralAuthors,
  InteractionAuthorName,
} from "../InteractionAuthorName";
import {
  CollapsibleDivider,
  ReplyButtonTextInput,
} from "../ReplyBlock/RepliesHeader";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "./constants";
import {
  QUESTIONS_AUDIENCE_LABELS,
  questionsAudienceNotice,
  type QuestionsAudience,
} from "src/questionsAudience";
import { SettingsTiny } from "components/Icons/SettingsTiny";

export function QuestionsButtonTextInput(props: {
  value: string;
  onCommit: (text: string) => void;
}) {
  return (
    <ReplyButtonTextInput
      {...props}
      label="Ask button text"
      placeholder={DEFAULT_QUESTIONS_BUTTON_TEXT}
      colors="bg-border-light border-border-light text-tertiary placeholder:text-tertiary focus:outline-border hover:outline-border"
    />
  );
}

export function DisabledAskButton(props: { text?: string }) {
  return (
    <ButtonPrimary compact disabled>
      {props.text || DEFAULT_QUESTIONS_BUTTON_TEXT}
    </ButtonPrimary>
  );
}

export type QuestionHelpProps = {
  audience?: QuestionsAudience;
  showPending?: boolean;
};

// Who may ask, and when a question shows
function questionHelpLines(props: QuestionHelpProps) {
  return [
    questionsAudienceNotice(props.audience ?? "anyone"),
    !props.showPending && "Questions show once the author answers them.",
  ].filter((line): line is string => !!line);
}

function QuestionHelp(props: QuestionHelpProps) {
  if (props.audience === "anyone" && props.showPending) return null;
  return (
    <div className="text-sm text-center italic text-tertiary">
      {questionsAudienceNotice(props.audience ?? "anyone")}
      {!props.showPending && " Questions show once the author answers them."}
      <hr className="mt-3" />
    </div>
  );
}

// Nothing to list yet; carries the help text in its place
export function QuestionsEmpty(props: QuestionHelpProps) {
  return (
    <div className="opaque-container text-sm italic text-tertiary text-center p-3 sm:p-4 leading-snug flex flex-col gap-2">
      <div className="font-bold">No questions yet…</div>
      {questionHelpLines(props).map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

// The editor's empty state: what readers will be able to do, and where to
// change it
export function QuestionsEditorNotice(props: QuestionHelpProps) {
  return (
    <div className="opaque-container text-sm italic text-tertiary text-center p-3 sm:p-4 leading-snug flex flex-col gap-2">
      <div className="text-base font-bold">No questions yet…</div>
      <div>
        {QUESTIONS_AUDIENCE_LABELS[props.audience ?? "anyone"].label} can submit
        questions. You can answer them from here.
      </div>
      <div>
        {props.showPending
          ? "Questions will be visible to readers as soon as they're submitted. You can remove any question at any time."
          : "Questions will only be visible to readers once you answer them."}
      </div>
      <hr />
      <div>
        To adjust this, click <SettingsTiny className="inline-flex scale-90" />{" "}
        in the upper right of this block.
      </div>
    </div>
  );
}

export function QuestionComposer(props: {
  // Beside the button, as on comments
  asker?: InteractionAuthor | null;
  draftKey: string | null;
  submitLabel?: string;
  autoFocus?: boolean;
  onSubmit: (text: FacetedText) => Promise<boolean>;
}) {
  return (
    <TextComposer
      draftKey={props.draftKey}
      mentions
      autoFocus={props.autoFocus}
      inputClassName="min-h-20!"
      onSubmit={(doc) => props.onSubmit(docToFacetedText(doc))}
      actions={
        <>
          {props.asker && (
            <Avatar
              src={props.asker.avatar}
              displayName={authorDisplayName(props.asker)}
              size="small"
            />
          )}
          <ComposerSubmit>
            {props.submitLabel || DEFAULT_QUESTIONS_BUTTON_TEXT}
          </ComposerSubmit>
        </>
      }
    />
  );
}

// What readers ask with, shown to the author without taking questions
export function QuestionComposerPreview(props: { action: React.ReactNode }) {
  return (
    <ComposerChrome
      editor={null}
      inputClassName="min-h-20! bg-transparent! text-tertiary! hover:border-border! italic"
      actions={props.action}
    >
      Readers will be able to ask a question here…
    </ComposerChrome>
  );
}

export function LoggedOutQuestionComposer(props: {
  linkAccount?: boolean;
  redirectRoute?: string;
  trigger?: React.ReactNode;
}) {
  return (
    <div className="w-full accent-container flex text-center justify-center gap-2 sm:p-4 p-3 text-tertiary italic text-sm ">
      <div>
        {props.trigger ?? (
          <LoginModal
            asChild
            noEmailLogin
            redirectRoute={props.redirectRoute}
            trigger={
              <button className="shrink-0 text-accent-contrast font-bold">
                {props.linkAccount ? "Link " : "Log in"}
              </button>
            }
          />
        )}{" "}
        {!props.linkAccount && "with"} an Atmosphere account to ask a question!
      </div>
    </div>
  );
}

// The editor's block before the post is published, or before anyone asks
export function QuestionEditorEmpty(
  props: QuestionHelpProps & { action: React.ReactNode },
) {
  return (
    <div className="flex flex-col gap-4">
      <QuestionComposerPreview action={props.action} />
      <hr />
      <QuestionsEditorNotice
        audience={props.audience}
        showPending={props.showPending}
      />
    </div>
  );
}

// One step of a question's thread. When the thread continues (the question
// has an answer under it), a line runs from this avatar down to the answer.
function ThreadEntry(props: {
  author: InteractionAuthor;
  showHandle?: boolean;
  date?: string;
  // Under the entry's content
  actions?: React.ReactNode;
  continues?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 min-w-0">
      <div className="flex flex-col items-center shrink-0">
        <Avatar
          src={props.author.avatar}
          displayName={authorDisplayName(props.author)}
          size="medium"
        />
        {props.continues && (
          <div className="w-[2px] grow bg-border-light mt-1" />
        )}
      </div>
      <div
        className={`flex flex-col min-w-0 grow ${props.continues ? "pb-3" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-h-6 min-w-0 text-sm whitespace-nowrap">
          <InteractionAuthorName
            author={props.author}
            showHandle={props.showHandle}
          />
          {props.date && (
            <span className="text-tertiary shrink-0">
              ·{" "}
              <LocalizedDate
                dateString={props.date}
                omitYear
                options={{ year: "2-digit", month: "short", day: "numeric" }}
              />
            </span>
          )}
        </div>
        {props.children}
        {props.actions && (
          <div className="mt-1 flex items-center gap-2">{props.actions}</div>
        )}
      </div>
    </div>
  );
}

export function QuestionRow(props: {
  question: DocumentQuestion;
  showHandle?: boolean;
  answer?: React.ReactNode;
  actions?: React.ReactNode;
  // Replaces the question's text while the asker edits it
  editor?: React.ReactNode;
}) {
  return (
    <div className="questionRow flex flex-col">
      <div className="pl-2 pr-3">
        <ThreadEntry
          author={props.question.asker}
          showHandle={props.showHandle}
          date={props.question.createdAt}
          actions={props.actions}
          continues={!!props.answer}
        >
          {props.editor ?? (
            <pre
              style={{ wordBreak: "break-word", fontFamily: "inherit" }}
              className="whitespace-pre-wrap text-primary leading-snug"
            >
              <BaseTextBlock
                index={[]}
                plaintext={props.question.plaintext}
                facets={props.question.facets}
                ugcLinks
              />
            </pre>
          )}
        </ThreadEntry>
      </div>
      {props.answer}
    </div>
  );
}

export function QuestionAnswer(props: {
  author: InteractionAuthor;
  showHandle?: boolean;
  date?: string;
  // Under the answer: the author's "Edit answer"
  actions?: React.ReactNode;
  // Holds the author's answer composer rather than a published answer
  composing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`questionAnswer relative opaque-container rounded-lg! p-2 pr-3 ${props.composing ? "border-border-light!" : "border-accent-contrast!"}`}
    >
      {!props.composing && (
        <span className="absolute -top-2.5 right-3 rounded-md bg-accent-1 text-accent-2 px-1.5 text-xs leading-5 font-bold uppercase">
          Answer
        </span>
      )}
      <ThreadEntry
        author={props.author}
        showHandle={props.showHandle}
        date={props.date}
        actions={props.actions}
      >
        {props.children}
      </ThreadEntry>
    </div>
  );
}

export function QuestionAction(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean },
) {
  let { primary, className, ...rest } = props;
  return (
    <button
      type="button"
      className={`text-sm shrink-0 flex items-center gap-1 disabled:opacity-50 ${
        primary
          ? "font-bold text-accent-contrast"
          : "text-tertiary hover:text-accent-contrast"
      } ${className ?? ""}`}
      {...rest}
    />
  );
}

// The reader's view: their own questions first, answered or not, then the
// answered ones, then any still waiting on an answer.
export function QuestionsList(
  props: QuestionHelpProps & {
    questions: DocumentQuestion[];
    // The composer or a sign-in button
    action?: React.ReactNode;
    renderAnswer: RenderAnswer;
    onWithdraw?: (uri: string) => void;
    // Resolves true once the edit is saved
    onEdit?: (uri: string, text: FacetedText) => Promise<boolean>;
  },
) {
  let { onWithdraw, onEdit } = props;
  // The viewer's question being edited
  let [editing, setEditing] = useState<string | null>(null);
  let others = props.questions.filter((q) => !q.mine);
  let ordered = [
    ...props.questions.filter((q) => q.mine),
    ...others.filter((q) => q.answer),
    ...others.filter((q) => !q.answer),
  ];
  return (
    <div className="flex flex-col gap-4">
      {props.action && (
        <>
          {props.action}
          <hr />
        </>
      )}
      {ordered.length === 0 ? (
        <QuestionsEmpty
          audience={props.audience}
          showPending={props.showPending}
        />
      ) : (
        <QuestionHelp
          audience={props.audience}
          showPending={props.showPending}
        />
      )}
      <QuestionRows
        questions={ordered}
        showHandles={showHandlesFor(props.questions)}
        renderAnswer={props.renderAnswer}
        renderEditor={(question) =>
          onEdit &&
          editing === question.uri && (
            <QuestionEditor
              question={question}
              onCancel={() => setEditing(null)}
              onSubmit={async (text) => {
                if (await onEdit(question.uri, text)) setEditing(null);
              }}
            />
          )
        }
        renderControls={(question) =>
          question.mine && !question.answer && editing !== question.uri
            ? [
                onEdit && (
                  <QuestionAction
                    aria-label="Edit question"
                    onClick={() => setEditing(question.uri)}
                  >
                    Edit
                  </QuestionAction>
                ),
                onWithdraw && (
                  <QuestionAction
                    aria-label="Withdraw question"
                    onClick={() => onWithdraw(question.uri)}
                  >
                    Withdraw
                  </QuestionAction>
                ),
              ]
            : []
        }
      />
    </div>
  );
}

// The asker's question, rewritten in place
function QuestionEditor(props: {
  question: DocumentQuestion;
  onCancel: () => void;
  onSubmit: (text: FacetedText) => Promise<void>;
}) {
  let [initialDoc] = useState(() =>
    facetedTextToDoc(props.question.plaintext, props.question.facets ?? []),
  );
  return (
    <TextComposer
      className="pt-1"
      mentions
      autoFocus
      initialDoc={initialDoc}
      onCancel={props.onCancel}
      onSubmit={async (doc) => {
        await props.onSubmit(docToFacetedText(doc));
        return false;
      }}
      actions={
        <>
          <ButtonTertiary compact className="text-sm" onClick={props.onCancel}>
            Cancel
          </ButtonTertiary>
          <ComposerSubmit className="text-sm">Update</ComposerSubmit>
        </>
      }
    />
  );
}

// The author's view: unanswered questions first, then answered ones, and the
// removed ones behind a collapsible header.
export function QuestionsModeration(props: {
  questions: DocumentQuestion[];
  header?: React.ReactNode;
  empty: React.ReactNode;
  busy?: boolean;
  onSetState?: (uri: string, state: QuestionState) => void;
  renderAnswer: RenderAnswer;
  renderControl: (question: DocumentQuestion) => React.ReactNode;
}) {
  let [showHidden, setShowHidden] = useState(false);
  let shown = props.questions.filter((q) => q.state !== "hidden");
  let ordered = [
    ...shown.filter((q) => !q.answer),
    ...shown.filter((q) => q.answer),
  ];
  let hidden = props.questions.filter((q) => q.state === "hidden");
  if (showHidden && hidden.length === 0) setShowHidden(false);
  let showHandles = showHandlesFor(props.questions);
  let stateButton = (
    q: DocumentQuestion,
    state: QuestionState,
    label: string,
  ) =>
    props.onSetState && (
      <QuestionAction
        disabled={props.busy}
        onClick={() => props.onSetState?.(q.uri, state)}
      >
        {label}
      </QuestionAction>
    );
  let rows = (
    questions: DocumentQuestion[],
    controls: (q: DocumentQuestion) => React.ReactNode[],
  ) => (
    <QuestionRows
      questions={questions}
      showHandles={showHandles}
      renderAnswer={props.renderAnswer}
      renderControls={(q) => [props.renderControl(q), ...controls(q)]}
    />
  );
  return (
    <div className="flex flex-col gap-4">
      {props.header}
      <hr />
      {ordered.length === 0
        ? props.empty
        : rows(ordered, (q) => [stateButton(q, "hidden", "Remove")])}
      {hidden.length > 0 && (
        <div className="flex flex-col gap-4">
          <CollapsibleDivider
            label={`Removed (${hidden.length})`}
            open={showHidden}
            onToggle={() => setShowHidden(!showHidden)}
          />
          {showHidden &&
            rows(hidden, (q) => [stateButton(q, "pending", "Restore")])}
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

// Questions separated by rules, each one's controls in a row under it.
function QuestionRows(props: {
  questions: DocumentQuestion[];
  showHandles?: boolean;
  renderAnswer: RenderAnswer;
  renderEditor?: (question: DocumentQuestion) => React.ReactNode;
  renderControls: (question: DocumentQuestion) => React.ReactNode[];
}) {
  if (props.questions.length === 0) return null;
  return (
    <div className="questionList flex flex-col gap-6 pb-3">
      {props.questions.map((question) => {
        let actions = props.renderControls(question).filter(Boolean);
        return (
          <Fragment key={question.uri}>
            <QuestionRow
              key={question.uri}
              question={question}
              showHandle={props.showHandles}
              answer={props.renderAnswer(question, props.showHandles)}
              editor={props.renderEditor?.(question) || undefined}
              actions={
                actions.length > 0 &&
                actions.map((control, i) => (
                  <Fragment key={i}>
                    {i > 0 && <Separator classname="h-4!" />}
                    {control}
                  </Fragment>
                ))
              }
            />
            <hr className="last:hidden" />
          </Fragment>
        );
      })}
    </div>
  );
}
