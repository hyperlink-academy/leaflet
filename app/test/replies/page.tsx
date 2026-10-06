"use client";
import React, { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { Popover } from "components/Popover";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import type { DocumentReply } from "src/documentReplies";
import {
  DEFAULT_REPLY_BUTTON_TEXT,
  DEFAULT_REPLY_PROMPT_TEXT,
} from "components/Blocks/ReplyBlock/constants";
import {
  RepliesDraft,
  RepliesList,
  RepliesModeration,
  RepliesStatusToggle,
  ReplyButtonTextInput,
  ReplyPromptTextInput,
  ReplyPicker,
  type ReplyCandidate,
} from "components/Blocks/ReplyBlock/RepliesView";

const rgb = (r: number, g: number, b: number) => ({
  $type: "site.standard.theme.color#rgb",
  r,
  g,
  b,
});
const THEMES = [
  {
    background: rgb(24, 28, 48),
    foreground: rgb(235, 235, 245),
    accent: rgb(255, 180, 60),
    accentForeground: rgb(24, 28, 48),
  },
  {
    background: rgb(255, 240, 228),
    foreground: rgb(70, 30, 20),
    accent: rgb(200, 60, 40),
    accentForeground: rgb(255, 255, 255),
  },
  undefined,
];

const reply = (
  i: number,
  title: string,
  author: string,
  pub: string,
  day: number,
  visible: boolean,
  mine = false,
): DocumentReply => {
  let did = `did:plc:replier${i}`;
  let publication = `at://${did}/site.standard.publication/pub`;
  return {
    uri: `at://${did}/pub.leaflet.interactions.reply/r${i}`,
    visible,
    mine,
    post: {
      uri: `at://${did}/site.standard.document/d${i}`,
      record: {
        $type: "site.standard.document",
        title,
        site: publication,
        publishedAt: `2026-10-0${day}T12:00:00.000Z`,
      },
      publication: {
        uri: publication,
        record: {
          name: pub,
          url: "https://example.com",
          preferences: {},
          basicTheme: THEMES[i % THEMES.length],
        },
      },
      author: { did, handle: null, displayName: author },
      contributors: [],
      commentsCount: 0,
      mentionsCount: 0,
      recommendsCount: 0,
    } as unknown as DocumentReply["post"],
  };
};

const REPLIES = [
  reply(0, "On Slow Software", "Maya Okafor", "Maya's Notes", 3, true),
  reply(
    1,
    "Counterpoint: Speed Is a Feature, and Always Was",
    "dev.blog",
    "The Dev Blog",
    4,
    true,
  ),
  reply(2, "Why I Left RSS", "june.bsky.social", "Marginalia", 5, false),
  reply(3, "Weeknotes 41", "Ari Lindqvist", "Field Notes", 5, false),
];
const VISIBLE = REPLIES.filter((r) => r.visible);

const MINE = reply(
  4,
  "A Reply From My Own Blog",
  "reader.bsky.social",
  "Reader's Digest-ish",
  6,
  false,
  true,
);

const CANDIDATES: ReplyCandidate[] = [
  ["A Reply From My Own Blog", "Oct 6"],
  ["Notes From a Slow Garden", "Sep 28"],
  ["On Reading Without a Goal", "Sep 14"],
  ["A Short History of the Footnote", "Aug 30"],
].map(([title, date], i) => ({
  uri: `at://did:plc:viewer/site.standard.document/d${i}`,
  title,
  date,
  publication: { name: "Reader's Digest-ish" },
}));

function Case(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" data-case={props.label}>
      <div className="text-sm font-bold text-tertiary">{props.label}</div>
      <div className="block-border p-2 sm:p-3">{props.children}</div>
    </div>
  );
}

export default function RepliesTestPage() {
  let [buttonText, setButtonText] = useState("Write a response");
  let [promptText, setPromptText] = useState("");
  let prompt = promptText || DEFAULT_REPLY_PROMPT_TEXT;
  let editablePrompt = (
    <ReplyPromptTextInput value={promptText} onCommit={setPromptText} />
  );
  let label = buttonText || DEFAULT_REPLY_BUTTON_TEXT;
  let replyButton = <ButtonPrimary>{label}</ButtonPrimary>;
  let editableButton = (
    <ReplyButtonTextInput value={buttonText} onCommit={setButtonText} />
  );
  return (
    <div className="mx-auto w-full max-w-[656px] p-4 flex flex-col gap-6 pb-[420px]">
      <Case label="Editor — draft (button text is editable in place)">
        <RepliesDraft prompt={editablePrompt} action={editableButton} />
      </Case>
      <Case label="Editor — published (moderation + editable button)">
        <RepliesModeration
          replies={REPLIES}
          onAccept={() => {}}
          onHide={() => {}}
          prompt={editablePrompt}
          action={editableButton}
        />
      </Case>
      <Case label="Published — reader, no replies, logged out">
        <RepliesList
          prompt={prompt}
          replies={[]}
          action={
            <ButtonPrimary>
              <BlueskyTiny /> {label}
            </ButtonPrimary>
          }
        />
      </Case>
      <Case label="Published — reader, no replies, logged in">
        <RepliesList prompt={prompt} replies={[]} action={replyButton} />
      </Case>
      <Case label="Published — author, no replies, closed">
        <RepliesList
          prompt={prompt}
          replies={[]}
          action={
            <RepliesStatusToggle
              replies={[]}
              canModerate
              open={false}
              onToggle={() => {}}
            />
          }
        />
      </Case>
      <Case label="Published — author, no replies, open">
        <RepliesModeration
          prompt={prompt}
          replies={[]}
          onAccept={() => {}}
          onHide={() => {}}
          action={
            <RepliesStatusToggle
              replies={[]}
              canModerate
              open
              onToggle={() => {}}
            />
          }
        />
      </Case>
      <Case label="Published — reader, logged in">
        <RepliesList prompt={prompt} replies={VISIBLE} action={replyButton} />
      </Case>
      <Case label="Published — reader, submissions shown with themes">
        <RepliesList
          prompt={prompt}
          replies={VISIBLE}
          showThemes
          action={replyButton}
        />
      </Case>
      <Case label="Published — author, submissions shown with themes">
        <RepliesModeration
          prompt={prompt}
          replies={REPLIES}
          showThemes
          onAccept={() => {}}
          onHide={() => {}}
        />
      </Case>
      <Case label="Published — reader who has a reply pending">
        <RepliesList
          prompt={prompt}
          replies={[...VISIBLE, MINE]}
          action={replyButton}
          onWithdraw={() => {}}
        />
      </Case>
      <Case label="Published — author">
        <RepliesModeration
          prompt={prompt}
          replies={REPLIES}
          onAccept={() => {}}
          onHide={() => {}}
        />
      </Case>
      <Case label="Published — author, nothing submitted yet">
        <RepliesModeration
          prompt={prompt}
          replies={[]}
          onAccept={() => {}}
          onHide={() => {}}
        />
      </Case>
      <Case label="Reader — reply picker popover">
        <RepliesList
          prompt={prompt}
          replies={VISIBLE.slice(0, 1)}
          action={
            <Popover asChild defaultOpen align="end" trigger={replyButton}>
              <ReplyPicker candidates={CANDIDATES} onSubmit={() => {}} />
            </Popover>
          }
        />
      </Case>
    </div>
  );
}
