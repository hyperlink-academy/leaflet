"use client";
import React, { Fragment, useState } from "react";
import { Popover } from "components/Popover";
import { Avatar } from "components/Avatar";
import { Separator } from "components/Layout";
import { InfoSmall } from "components/Icons/InfoSmall";
import { LoginModal } from "components/LoginButton";
import { BaseTextBlock } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import { ComposerSubmit } from "components/Composer";
import { TextComposer } from "components/Composer/TextComposer";
import {
  docToFacetedText,
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
  RepliesDivider,
  ReplyButtonTextInput,
} from "../ReplyBlock/RepliesHeader";
import { ActionsBox } from "../ReplyBlock/RepliesList";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "./constants";
import {
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
      Your question
      {props.showPending
        ? " will appear here unless the author hides it."
        : " will appear here once the author answers it."}
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

export function QuestionComposer(props: {
  // Beside the button, as on comments
  asker?: InteractionAuthor | null;
  draftKey: string | null;
  submitLabel?: string;
  autoFocus?: boolean;
  audience?: QuestionsAudience;
  showPending?: boolean;
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
          <AudienceNotice audience={props.audience} />
          <PublicQuestionNotice
            audience={props.audience}
            showPending={props.showPending}
          />
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

// The editor shows readers' input without taking questions.
export function QuestionComposerPreview(props: {
  action: React.ReactNode;
  audience?: QuestionsAudience;
  showPending?: boolean;
}) {
  return (
    <div className="flex flex-col grow">
      <div className="composerInput border input-with-border min-h-20 px-2 py-[6px] text-tertiary italic">
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
      <div className="opaque-container text-sm italic text-tertiary text-center p-3 sm:p-4">
        <div className="text-base font-bold">Question and Answers</div>
        Here, logged in readers can post public questions that you can answer!
        To change who can ask a question and when questions become public,
        select <SettingsTiny /> in the upper right of this block.
      </div>
    </div>
  );
}

// One step of a question's thread. When the thread continues (the question
// has an answer under it), a line runs from this avatar down to the answer.
function ThreadEntry(props: {
  author: InteractionAuthor;
  showHandle?: boolean;
  date?: string;
  // At the far end of the name line, never truncated
  trailing?: React.ReactNode;
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
          {props.trailing && (
            <div className="ml-auto pl-1 shrink-0 flex items-center gap-2">
              {props.trailing}
            </div>
          )}
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function QuestionRow(props: {
  question: DocumentQuestion;
  showHandle?: boolean;
  answer?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="questionRow flex flex-col">
      <div className="pl-2 pr-3">
        <ThreadEntry
          author={props.question.asker}
          showHandle={props.showHandle}
          date={props.question.createdAt}
          trailing={props.actions}
          continues={!!props.answer}
        >
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
  labeled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="questionAnswer opaque-container p-2 pr-3">
      <ThreadEntry
        author={props.author}
        showHandle={props.showHandle}
        date={props.date}
        trailing={
          props.labeled && (
            <span className="rounded-md bg-accent-1 text-accent-2 px-1.5 text-xs leading-5 font-bold uppercase">
              Answer
            </span>
          )
        }
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
export function QuestionsList(props: {
  questions: DocumentQuestion[];
  // The composer or a sign-in button
  action?: React.ReactNode;
  renderAnswer: RenderAnswer;
  onWithdraw?: (uri: string) => void;
}) {
  let { onWithdraw } = props;
  let others = props.questions.filter((q) => !q.mine);
  let ordered = [
    ...props.questions.filter((q) => q.mine),
    ...others.filter((q) => q.answer),
    ...others.filter((q) => !q.answer),
  ];
  return (
    <div className="flex flex-col gap-4">
      {props.action}
      <QuestionRows
        questions={ordered}
        showHandles={showHandlesFor(props.questions)}
        renderAnswer={props.renderAnswer}
        renderControls={(question) => [
          onWithdraw && question.mine && !question.answer && (
            <QuestionAction
              aria-label="Withdraw question"
              onClick={() => onWithdraw(question.uri)}
            >
              Withdraw
            </QuestionAction>
          ),
        ]}
      />
    </div>
  );
}

// The author's view: pending questions first, under a header that collapses
// them, then the ones shown on the post, and the removed ones behind another.
export function QuestionsModeration(props: {
  questions: DocumentQuestion[];
  // Above the lists: the editor's composer preview
  header?: React.ReactNode;
  // A state change is being published
  busy?: boolean;
  // Unset for an editor who isn't the post's author
  onSetState?: (uri: string, state: QuestionState) => void;
  renderAnswer: RenderAnswer;
  // After a question's moderation controls: "Answer", or a link to the
  // editor
  renderControl: (question: DocumentQuestion) => React.ReactNode;
}) {
  let [pendingOpen, setPendingOpen] = useState(true);
  let [showHidden, setShowHidden] = useState(false);
  let inState = (state: QuestionState) =>
    props.questions.filter((q) => q.state === state);
  let pending = inState("pending");
  let accepted = inState("accepted");
  let hidden = inState("hidden");
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
      renderControls={(q) => [...controls(q), props.renderControl(q)]}
    />
  );
  return (
    <div className="flex flex-col gap-4">
      {props.header}
      {props.questions.length === 0 && (
        <div className="opaque-container text-sm italic text-tertiary text-center p-3">
          No one has asked anything yet.
        </div>
      )}
      {pending.length > 0 && (
        <div className="flex flex-col gap-4">
          <CollapsibleDivider
            label={`Pending (${pending.length})`}
            open={pendingOpen}
            onToggle={() => setPendingOpen(!pendingOpen)}
          />
          {pendingOpen &&
            rows(pending, (q) => [stateButton(q, "hidden", "Remove")])}
        </div>
      )}
      {accepted.length > 0 && (
        <div className="flex flex-col gap-4">
          <RepliesDivider label={`Questions (${accepted.length})`} />
          {rows(accepted, (q) => [stateButton(q, "hidden", "Remove")])}
        </div>
      )}
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

// Questions separated by rules, each one's controls boxed at the end of the
// asker's name line.
function QuestionRows(props: {
  questions: DocumentQuestion[];
  showHandles?: boolean;
  renderAnswer: RenderAnswer;
  renderControls: (question: DocumentQuestion) => React.ReactNode[];
}) {
  if (props.questions.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {props.questions.map((question) => {
        let controls = props.renderControls(question).filter(Boolean);
        return (
          <Fragment key={question.uri}>
            <QuestionRow
              key={question.uri}
              question={question}
              showHandle={props.showHandles}
              answer={props.renderAnswer(question, props.showHandles)}
              actions={
                controls.length > 0 && (
                  <ActionsBox>
                    {controls.map((control, i) => (
                      <Fragment key={i}>
                        {i > 0 && <Separator classname="h-4!" />}
                        {control}
                      </Fragment>
                    ))}
                  </ActionsBox>
                )
              }
            />
            <hr className="last:hidden" />
          </Fragment>
        );
      })}
    </div>
  );
}
