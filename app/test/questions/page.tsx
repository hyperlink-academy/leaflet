"use client";
import React, { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import type { DocumentQuestion, QuestionState } from "src/documentQuestions";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "components/Blocks/QuestionsBlock/constants";
import {
  PublicQuestionNotice,
  QuestionAction,
  QuestionAnswer,
  QuestionComposer,
  QuestionComposerPreview,
  QuestionsButtonTextInput,
  QuestionsDraft,
  QuestionsList,
  QuestionsModeration,
  SignInToAsk,
} from "components/Blocks/QuestionsBlock/QuestionsView";
import { LimitedLeafletComposer } from "components/Composer/LimitedLeafletComposer";
import { PublishedAnswer } from "components/Blocks/QuestionsBlock/PublishedAnswer";
import type { FacetedText } from "components/Composer/facetedText";

const VIEWER = "did:plc:viewer";
const AUTHOR = "did:plc:author";
const AUTHOR_PROFILE = {
  did: AUTHOR,
  handle: "author.bsky.social",
  displayName: "The Author",
  avatar: null,
};

const paragraph = (plaintext: string) => ({
  $type: "pub.leaflet.pages.linearDocument#block" as const,
  block: { $type: "pub.leaflet.blocks.text" as const, plaintext },
});

const answerContent = (paragraphs: string[]) => ({
  $type: "pub.leaflet.pages.linearDocument" as const,
  blocks: paragraphs.map(paragraph),
});

// Ids are explicit so server and client render the same mock data.
const question = (
  i: number,
  args: {
    text: string;
    name: string;
    handle?: string;
    did?: string;
    day?: number;
    answer?: string[];
    mine?: boolean;
    state?: QuestionState;
  },
): DocumentQuestion => {
  let did = args.did ?? `did:plc:asker${i}`;
  return {
    uri: `at://${did}/pub.leaflet.interactions.question/q${i}`,
    block: null,
    state: args.state ?? (args.answer ? "accepted" : "pending"),
    mine: !!args.mine,
    asker: {
      did,
      handle:
        args.handle ??
        `${args.name.toLowerCase().replace(/\W+/g, "")}.bsky.social`,
      displayName: args.name,
      avatar: null,
    },
    plaintext: args.text,
    facets: undefined,
    createdAt: `2026-10-0${args.day ?? (i % 6) + 1}T09:30:00.000Z`,
    answer: args.answer
      ? {
          uri: `at://${AUTHOR}/pub.leaflet.interactions.answer/a${i}`,
          author: AUTHOR_PROFILE,
          content: answerContent(args.answer),
          createdAt: `2026-10-0${Math.min((args.day ?? 1) + 1, 9)}T12:00:00.000Z`,
        }
      : null,
  };
};

const seed = (): DocumentQuestion[] => [
  question(0, {
    text: "How do you decide when a feature is worth the maintenance cost? I keep adding things and regretting it a year later.",
    name: "June Park",
    day: 2,
    answer: [
      "I ask whether I'd still want it if I had to rebuild it from scratch next year. Most features fail that test.",
      "The ones that pass tend to be boring: faster search, better defaults, fewer settings.",
    ],
  }),
  question(1, {
    text: "Is there a reading list for the slow software idea? Books, essays, anything.",
    name: "Ari Lindqvist",
    day: 3,
    answer: ["Not a formal one, but start with the essays I linked last week."],
  }),
  question(2, {
    text: "What do you use for your own notes?",
    name: "Dev Blog",
    handle: "dev.blog",
    day: 5,
  }),
  question(3, {
    text: "Would you ever go back to a bigger team?",
    name: "Sam Rivera",
    day: 5,
    state: "accepted",
  }),
  question(4, {
    text: "buy followers cheap!!",
    name: "Spam Account",
    day: 6,
    state: "hidden",
  }),
];

const BLOCK_CLASS = "light-container rounded-lg! p-2 sm:p-3";

function Case(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" data-case={props.label}>
      <div className="text-sm font-bold text-tertiary">{props.label}</div>
      <div className={BLOCK_CLASS}>{props.children}</div>
    </div>
  );
}

// The published post labels answers; the editor doesn't.
const renderPublished = (q: DocumentQuestion) =>
  q.answer ? <PublishedAnswer answer={q.answer} labeled /> : null;
const renderInEditor = (q: DocumentQuestion) =>
  q.answer ? <PublishedAnswer answer={q.answer} /> : null;

// Stands in for the leaflet block editor, which needs replicache.
function FakeLimitedLeafletEditor(props: {
  value: string;
  onChange: (v: string) => void;
  onPublish: () => void;
  onClear: () => void;
}) {
  return (
    <QuestionAnswer author={AUTHOR_PROFILE}>
      <LimitedLeafletComposer
        editor={null}
        onPublish={props.onPublish}
        onClear={props.onClear}
      >
        <textarea
          className="w-full bg-transparent outline-none resize-none"
          rows={3}
          placeholder="Write your answer with the full block editor…"
          value={props.value}
          onChange={(e) => props.onChange(e.currentTarget.value)}
        />
      </LimitedLeafletComposer>
    </QuestionAnswer>
  );
}

type Viewer = "logged-out" | "reader" | "author";

// One block whose state the toolbar drives: ask as a reader, answer inline
// as the author, switch viewer.
function Playground() {
  let [questions, setQuestions] = useState<DocumentQuestion[]>(seed);
  let [viewer, setViewer] = useState<Viewer>("reader");
  let [drafts, setDrafts] = useState<Record<string, string>>({});
  let [showPending, setShowPending] = useState(false);
  let setState = (uri: string, state: QuestionState) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.uri === uri
          ? {
              ...q,
              state: state === "pending" && q.answer ? "accepted" : state,
            }
          : q,
      ),
    );
  let pending = questions.filter((q) => !q.answer).length;
  let withdraw = (uri: string) =>
    setQuestions((qs) => qs.filter((q) => q.uri !== uri));
  let edit = async (uri: string, text: FacetedText) => {
    await new Promise((r) => setTimeout(r, 400));
    setQuestions((qs) =>
      qs.map((q) => (q.uri === uri ? { ...q, ...text } : q)),
    );
    return true;
  };
  let publish = (uri: string) => {
    let text = drafts[uri]?.trim();
    if (!text) return alert("Write an answer first.");
    setQuestions((qs) =>
      qs.map((q) =>
        q.uri === uri
          ? {
              ...q,
              state: q.state === "hidden" ? "hidden" : "accepted",
              answer: {
                uri: `${q.uri}#answer`,
                author: AUTHOR_PROFILE,
                content: answerContent(text.split(/\n+/)),
                createdAt: new Date().toISOString(),
              },
            }
          : q,
      ),
    );
    setDrafts(({ [uri]: _, ...rest }) => rest);
  };

  let view: React.ReactNode;
  if (viewer === "author") {
    view = (
      <QuestionsModeration
        questions={questions}
        onSetState={setState}
        renderAnswer={(q) =>
          q.uri in drafts ? (
            <FakeLimitedLeafletEditor
              value={drafts[q.uri]}
              onChange={(v) => setDrafts((d) => ({ ...d, [q.uri]: v }))}
              onPublish={() => publish(q.uri)}
              onClear={() => setDrafts(({ [q.uri]: _, ...rest }) => rest)}
            />
          ) : (
            renderInEditor(q)
          )
        }
        renderControl={(q) =>
          q.uri in drafts ? null : (
            <QuestionAction
              primary
              onClick={() => setDrafts((d) => ({ ...d, [q.uri]: "" }))}
            >
              {q.answer ? "Write a new answer" : "Answer"}
            </QuestionAction>
          )
        }
      />
    );
  } else {
    let shown = questions.filter(
      (q) =>
        q.state === "accepted" ||
        (showPending && q.state === "pending") ||
        (viewer === "reader" && q.mine),
    );
    view = (
      <QuestionsList
        questions={shown}
        onWithdraw={withdraw}
        onEdit={edit}
        renderAnswer={renderPublished}
        action={
          viewer === "reader" ? (
            <QuestionComposer
              draftKey={null}
              showPending={showPending}
              onSubmit={async (text) => {
                await new Promise((r) => setTimeout(r, 400));
                setQuestions((qs) => [
                  ...qs,
                  question(100 + qs.length, {
                    text: text.plaintext,
                    name: "You",
                    did: VIEWER,
                    handle: "you.bsky.social",
                    day: 7,
                    mine: true,
                  }),
                ]);
                alert("Toast: Question sent.");
                return true;
              }}
            />
          ) : (
            <SignInToAsk
              trigger={
                <ButtonPrimary compact onClick={() => setViewer("reader")}>
                  Log in
                </ButtonPrimary>
              }
            />
          )
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-tertiary">Viewing as</span>
        {(["logged-out", "reader", "author"] as Viewer[]).map((v) => (
          <label key={v} className="flex items-center gap-1">
            <input
              type="radio"
              name="viewer"
              checked={viewer === v}
              onChange={() => setViewer(v)}
            />
            {v}
          </label>
        ))}
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showPending}
            onChange={() => setShowPending(!showPending)}
          />
          show pending
        </label>
        <span className="grow" />
        <ButtonSecondary
          compact
          onClick={() => {
            setQuestions(seed());
            setDrafts({});
          }}
        >
          Reset
        </ButtonSecondary>
      </div>
      <div className={BLOCK_CLASS}>{view}</div>
      <div className="text-xs text-tertiary">
        {questions.length} questions · {pending} unanswered ·{" "}
        {Object.keys(drafts).length} being answered
      </div>
    </div>
  );
}

export default function QuestionsTestPage() {
  let [buttonText, setButtonText] = useState("");
  let label = buttonText || DEFAULT_QUESTIONS_BUTTON_TEXT;
  let editableButton = (
    <QuestionsButtonTextInput value={buttonText} onCommit={setButtonText} />
  );
  let all = seed();
  let answered = all.filter((q) => q.state === "accepted");
  let mine = question(50, {
    text: "Do you have a template for the weekly review you mentioned?",
    name: "You",
    did: VIEWER,
    handle: "you.bsky.social",
    day: 6,
    mine: true,
  });
  let mineAnswered = question(51, {
    text: "What's the first thing you'd cut from your own app?",
    name: "You",
    did: VIEWER,
    handle: "you.bsky.social",
    day: 4,
    mine: true,
    answer: ["Probably half the settings page."],
  });
  let noop = () => {};
  // all[2] is pending with a draft, so its draft is open.
  let isOpen = (q: DocumentQuestion) => q.uri === all[2].uri;
  let answerControl = (q: DocumentQuestion) => (
    <QuestionAction primary>
      {q.answer ? "Edit answer" : "Answer"}
    </QuestionAction>
  );
  return (
    <div className="mx-auto w-full max-w-[656px] p-4 flex flex-col gap-8 pb-[420px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Questions block</h1>
        <p className="text-secondary text-sm">
          Everything below is mocked: no records are written. The playground
          keeps state between viewers; the author's inline editor is a stand-in
          for the real block editor.
        </p>
      </div>
      <Case label="Playground (control sandbox: author gets the editor's inline answers)">
        <Playground />
      </Case>
      <Case label="Editor — draft (button text editable in place)">
        <QuestionsDraft action={editableButton} />
      </Case>
      <Case label="Editor — published, one answer being written inline">
        <QuestionsModeration
          questions={all}
          onSetState={noop}
          header={<QuestionComposerPreview action={editableButton} />}
          renderAnswer={(q) =>
            isOpen(q) ? (
              <QuestionAnswer author={AUTHOR_PROFILE}>
                <LimitedLeafletComposer
                  editor={null}
                  onPublish={noop}
                  onClear={noop}
                >
                  <div className="text-tertiary italic">
                    The leaflet block editor mounts here.
                  </div>
                </LimitedLeafletComposer>
              </QuestionAnswer>
            ) : (
              renderInEditor(q)
            )
          }
          renderControl={(q) => (isOpen(q) ? null : answerControl(q))}
        />
      </Case>
      <Case label="Published — reader, logged out">
        <QuestionsList
          questions={answered}
          renderAnswer={renderPublished}
          action={<SignInToAsk />}
        />
      </Case>
      <Case label="Published — reader, logged in (comment composer + public notice)">
        <QuestionsList
          questions={answered}
          renderAnswer={renderPublished}
          action={
            <QuestionComposer
              draftKey={null}
              submitLabel={label}
              onSubmit={async () => true}
            />
          }
        />
      </Case>
      <Case label="Published — reader with their own questions, showing pending (mine first, unanswered last)">
        <QuestionsList
          questions={[...answered, all[2], mineAnswered, mine]}
          onWithdraw={noop}
          onEdit={async () => true}
          renderAnswer={renderPublished}
          action={
            <QuestionComposer
              draftKey={null}
              submitLabel={label}
              onSubmit={async () => true}
            />
          }
        />
      </Case>
      <Case label="Published — long names truncate, actions and label don't (narrow block)">
        <div className="max-w-[340px]">
          <QuestionsList
            questions={[
              question(60, {
                text: "Will there be a part two?",
                name: "Someone With An Extremely Long Display Name",
                handle: "someone-with-a-very-long-handle.example.com",
                did: VIEWER,
                mine: true,
              }),
              {
                ...all[1],
                answer: all[1].answer && {
                  ...all[1].answer,
                  author: {
                    ...AUTHOR_PROFILE,
                    displayName: "The Author Of This Very Long Post Title",
                    handle: "the-author-of-this-post.bsky.social",
                  },
                },
              },
            ]}
            onWithdraw={noop}
            renderAnswer={renderPublished}
          />
        </div>
      </Case>
      <Case label="Published — author (answers in the editor)">
        <QuestionsModeration
          questions={all}
          onSetState={noop}
          renderAnswer={renderPublished}
          renderControl={(q) =>
            !q.answer && (
              <QuestionAction primary>Answer in editor</QuestionAction>
            )
          }
        />
      </Case>
      <Case label="Published — author, nothing asked yet">
        <QuestionsModeration
          questions={[]}
          onSetState={noop}
          renderAnswer={renderPublished}
          renderControl={() => null}
        />
      </Case>
      <Case label="Public-question notice (open)">
        <div className="flex justify-end items-end min-h-32">
          <PublicQuestionNotice defaultOpen />
        </div>
      </Case>
    </div>
  );
}
