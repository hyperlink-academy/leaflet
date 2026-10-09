"use client";
import React, { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import type { DocumentQuestion } from "src/documentQuestions";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "components/Blocks/QuestionsBlock/constants";
import {
  AnswerEditorFrame,
  PublicQuestionNotice,
  QuestionComposer,
  QuestionComposerPreview,
  QuestionsButtonTextInput,
  QuestionsDraft,
  QuestionsList,
  QuestionsModeration,
  SignInToAsk,
} from "components/Blocks/QuestionsBlock/QuestionsView";
import { PublishedAnswer } from "components/Blocks/QuestionsBlock/PublishedAnswer";

const VIEWER = "did:plc:viewer";
const AUTHOR = "did:plc:author";

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
  },
): DocumentQuestion => {
  let did = args.did ?? `did:plc:asker${i}`;
  return {
    uri: `at://${did}/pub.leaflet.interactions.question/q${i}`,
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
          content: answerContent(args.answer),
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
  }),
];

function Case(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" data-case={props.label}>
      <div className="text-sm font-bold text-tertiary">{props.label}</div>
      <div className="block-border p-2 sm:p-3">{props.children}</div>
    </div>
  );
}

const renderPublished = (q: DocumentQuestion) =>
  q.answer ? <PublishedAnswer answer={q.answer} /> : null;

// Stands in for the leaflet block editor, which needs replicache.
function FakeAnswerEditor(props: {
  value: string;
  onChange: (v: string) => void;
  published: boolean;
  onPublish: () => void;
  onCancel: () => void;
}) {
  return (
    <AnswerEditorFrame
      published={props.published}
      discardOnClose
      onPublish={props.onPublish}
      onCancel={props.onCancel}
    >
      <textarea
        className="w-full px-3 py-1 bg-transparent outline-none resize-none"
        rows={3}
        placeholder="Write your answer with the full block editor…"
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
      />
    </AnswerEditorFrame>
  );
}

type Viewer = "logged-out" | "reader" | "author";

// One block whose state the toolbar drives: ask as a reader, answer inline
// as the author, switch viewer.
function Playground() {
  let [questions, setQuestions] = useState<DocumentQuestion[]>(seed);
  let [viewer, setViewer] = useState<Viewer>("reader");
  let [drafts, setDrafts] = useState<Record<string, string>>({});
  let pending = questions.filter((q) => !q.answer).length;
  let withdraw = (uri: string) =>
    setQuestions((qs) => qs.filter((q) => q.uri !== uri));
  let publish = (uri: string) => {
    let text = drafts[uri]?.trim();
    if (!text) return alert("Write an answer first.");
    setQuestions((qs) =>
      qs.map((q) =>
        q.uri === uri
          ? {
              ...q,
              answer: {
                uri: `${q.uri}#answer`,
                content: answerContent(text.split(/\n+/)),
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
        renderAnswer={(q) =>
          q.uri in drafts ? (
            <FakeAnswerEditor
              value={drafts[q.uri]}
              onChange={(v) => setDrafts((d) => ({ ...d, [q.uri]: v }))}
              published={!!q.answer}
              onPublish={() => publish(q.uri)}
              onCancel={() =>
                setDrafts(({ [q.uri]: _, ...rest }) => rest)
              }
            />
          ) : (
            renderPublished(q)
          )
        }
        renderControl={(q) =>
          q.uri in drafts ? null : (
            <ButtonPrimary
              compact
              onClick={() => setDrafts((d) => ({ ...d, [q.uri]: "" }))}
            >
              {q.answer ? "Write a new answer" : "Answer"}
            </ButtonPrimary>
          )
        }
      />
    );
  } else {
    let shown = questions.filter(
      (q) => q.answer || (viewer === "reader" && q.mine),
    );
    view = (
      <QuestionsList
        questions={shown}
        onWithdraw={withdraw}
        renderAnswer={renderPublished}
        action={
          viewer === "reader" ? (
            <QuestionComposer
              draftKey={null}
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
                <button onClick={() => setViewer("reader")}>Log in</button>
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
      <div className="block-border p-2 sm:p-3">{view}</div>
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
  let answered = all.filter((q) => q.answer);
  let mine = question(50, {
    text: "Do you have a template for the weekly review you mentioned?",
    name: "You",
    did: VIEWER,
    handle: "you.bsky.social",
    day: 6,
    mine: true,
  });
  let noop = () => {};
  // Mirrors the real control: drafts persist after publishing, all[3] has an
  // unpublished one.
  let answerControl = (q: DocumentQuestion) => (
    <ButtonPrimary compact>
      {q.uri === all[3].uri
        ? "Continue answer"
        : q.answer
          ? "Edit answer"
          : "Answer"}
    </ButtonPrimary>
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
          header={<QuestionComposerPreview action={editableButton} />}
          renderAnswer={(q) =>
            q.uri === all[2].uri ? (
              <AnswerEditorFrame
                published={false}
                discardOnClose
                onPublish={noop}
                onCancel={noop}
              >
                <div className="px-3 py-1 text-tertiary italic">
                  The leaflet block editor mounts here.
                </div>
              </AnswerEditorFrame>
            ) : (
              renderPublished(q)
            )
          }
          renderControl={(q) => (q.uri === all[2].uri ? null : answerControl(q))}
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
      <Case label="Published — reader with a question awaiting an answer">
        <QuestionsList
          questions={[...answered, mine]}
          onWithdraw={noop}
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
      <Case label="Published — author (answers in the editor)">
        <QuestionsModeration
          questions={all}
          renderAnswer={renderPublished}
          renderControl={(q) =>
            !q.answer && <ButtonSecondary compact>Answer in editor</ButtonSecondary>
          }
        />
      </Case>
      <Case label="Published — author, nothing asked yet">
        <QuestionsModeration
          questions={[]}
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
