"use client";
import React from "react";
import {
  ReplyPicker,
  ReplyPublicationSelector,
  type ReplyCandidate,
  type ReplyPublication,
} from "components/Blocks/ReplyBlock/ReplyPicker";
import { ReplyingTo } from "components/Pages/ReplyingTo";
import { RepliesList } from "components/Blocks/ReplyBlock/RepliesList";
import { Err, Ok } from "src/result";
import type { ReplyDraft, ReplyTarget } from "src/documentReplies";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

const replyDrafts: ReplyDraft[] = [
  {
    leaflet: "00000000-0000-0000-0000-000000000001",
    title: "A reply I'm still working on",
    block: null,
    publication: {
      uri: "at://did:plc:viewer/pub.leaflet.publication/a",
      record: normalizePublicationRecord({
        $type: "pub.leaflet.publication",
        name: "Field Notes",
        base_path: "fieldnotes.leaflet.pub",
      }),
    },
  },
  {
    leaflet: "00000000-0000-0000-0000-000000000002",
    title: "Untitled",
    block: null,
    publication: null,
  },
];

function DraftsHarness() {
  let [drafts, setDrafts] = React.useState(replyDrafts);
  return (
    <RepliesList
      replies={[]}
      drafts={drafts}
      showThemes
      onWithdrawDraft={(leaflet) =>
        setDrafts((d) => d.filter((x) => x.leaflet !== leaflet))
      }
    />
  );
}

const candidates: ReplyCandidate[] = [
  "On slow mornings",
  "Notes from the garden",
  "What I read in September",
  "Late summer tomatoes",
  "Letters I never sent",
  "A sixth post to scroll to",
].map((title, i) => ({
  uri: `at://did:plc:viewer/pub.leaflet.document/${i}`,
  title,
  date: `Sep ${28 - i}`,
  publication: { name: "Field Notes" },
  submitted: i === 1,
}));

const publications: ReplyPublication[] = [
  {
    uri: "at://did:plc:viewer/pub.leaflet.publication/a",
    name: "Field Notes",
    record: null,
  },
  {
    uri: "at://did:plc:viewer/pub.leaflet.publication/b",
    name: "Kitchen Table",
    record: null,
  },
];

const target: ReplyTarget = {
  uri: "at://did:plc:author/pub.leaflet.document/x",
  title: "Why I stopped writing newsletters",
  href: "#",
  publication: { name: "Kitchen Table", icon: null },
  authorHandle: "author.bsky.social",
  authorAvatar: null,
  replyUri: "at://did:plc:viewer/pub.leaflet.interactions.reply/a",
  pending: false,
};

const avatarTarget: ReplyTarget = {
  uri: "at://did:plc:friend/pub.leaflet.document/z",
  title: "A looseleaf with an author avatar",
  href: "#",
  publication: null,
  authorHandle: "friend.bsky.social",
  authorAvatar:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23c08'/%3E%3C/svg%3E",
  replyUri: "at://did:plc:viewer/pub.leaflet.interactions.reply/b",
  pending: false,
};

const looseleafTarget: ReplyTarget = {
  uri: "at://did:plc:other/pub.leaflet.document/y",
  title: "A post with no publication, avatar or handle",
  href: "#",
  publication: null,
  authorHandle: null,
  authorAvatar: null,
  replyUri: null,
  pending: false,
};

const longTarget: ReplyTarget = {
  uri: "at://did:plc:long/pub.leaflet.document/w",
  title:
    "A very long post title that has to truncate instead of wrapping onto another line",
  href: "#",
  publication: { name: "Field Notes", icon: null },
  authorHandle: "someone-with-a-really-long-handle.example.com",
  authorAvatar: null,
  replyUri: "at://did:plc:viewer/pub.leaflet.interactions.reply/c",
  pending: true,
};

const noop = async () => {};

const resolveLink = async (url: string) => {
  await new Promise((r) => setTimeout(r, 500));
  return url.includes("/p/")
    ? Ok({
        uri: "at://did:plc:viewer/pub.leaflet.document/old",
        title: "An older post found by link",
        date: "Jan 3",
        publication: { name: "Field Notes" },
      })
    : Err("We couldn't find that post.");
};

function Case(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" data-case={props.title}>
      <div className="text-sm text-tertiary">{props.title}</div>
      <div className="w-fit p-2 border border-border rounded-md bg-bg-page">
        {props.children}
      </div>
    </div>
  );
}

export default function RepliesHarness() {
  return (
    <div className="p-6 flex flex-col gap-8 bg-bg-leaflet min-h-screen">
      <Case title="Picker: has posts and publications">
        <ReplyPicker
          candidates={candidates}
          publications={publications}
          onSubmit={() => {}}
          resolveLink={resolveLink}
          onCreateDraft={noop}
        />
      </Case>
      <Case title="Picker: no publications">
        <ReplyPicker
          candidates={[]}
          publications={[]}
          onSubmit={() => {}}
          resolveLink={resolveLink}
          onCreateDraft={noop}
        />
      </Case>
      <Case title="Picker: still loading">
        <ReplyPicker
          candidates={[]}
          onSubmit={() => {}}
          resolveLink={resolveLink}
          onCreateDraft={noop}
        />
      </Case>
      <Case title="Publication selector">
        <ReplyPublicationSelector
          publications={publications}
          onBack={() => {}}
          onCreateDraft={noop}
        />
      </Case>
      <Case title="Publication selector: no publications">
        <ReplyPublicationSelector
          publications={[]}
          onBack={() => {}}
          onCreateDraft={noop}
        />
      </Case>
      <Case title="In reply to: several posts, truncating">
        <div className="w-[min(600px,80vw)]">
          <ReplyingTo
            targets={[target, avatarTarget, looseleafTarget, longTarget]}
          />
        </div>
      </Case>
      <Case title="In reply to: withdrawable (the first succeeds, the second fails)">
        <div className="w-[min(600px,80vw)]">
          <ReplyingTo
            targets={[target, longTarget]}
            onWithdraw={async (t) => {
              await new Promise((r) => setTimeout(r, 800));
              return t.uri === target.uri;
            }}
          />
        </div>
      </Case>
      <Case title="Reply block: my drafts above pending">
        <div className="w-[min(600px,80vw)]">
          <DraftsHarness />
        </div>
      </Case>
    </div>
  );
}
