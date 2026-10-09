"use client";
import React from "react";
import {
  ReplyPicker,
  ReplyPublicationSelector,
  type ReplyCandidate,
  type ReplyPublication,
} from "components/Blocks/ReplyBlock/RepliesView";
import { ReplyingTo } from "components/Pages/ReplyingTo";

const candidates: ReplyCandidate[] = [
  "On slow mornings",
  "Notes from the garden",
  "What I read in September",
  "A fourth post that should not show",
  "A fifth post that should not show",
].map((title, i) => ({
  uri: `at://did:plc:viewer/pub.leaflet.document/${i}`,
  title,
  date: `Sep ${28 - i}`,
  publication: { name: "Field Notes" },
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

const target = {
  uri: "at://did:plc:author/pub.leaflet.document/x",
  title: "Why I stopped writing newsletters",
  href: "#",
};

const noop = async () => {};

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
          onCreateDraft={noop}
        />
      </Case>
      <Case title="Picker: no publications">
        <ReplyPicker
          candidates={[]}
          publications={[]}
          onSubmit={() => {}}
          onCreateDraft={noop}
        />
      </Case>
      <Case title="Picker: still loading">
        <ReplyPicker candidates={[]} onSubmit={() => {}} onCreateDraft={noop} />
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
      <Case title="Standalone editor chip">
        <ReplyingTo target={target} className="pb-2" />
      </Case>
      <Case title="Editor header chip">
        <div className="flex gap-2 items-center">
          <span className="text-accent-contrast font-bold">Field Notes</span>
          <div className="font-bold text-tertiary px-1 h-[20px] text-sm flex place-items-center bg-border-light rounded-md ">
            DRAFT
          </div>
          <ReplyingTo target={target} />
        </div>
      </Case>
      <Case title="Publish page row">
        <div className="flex flex-col gap-2 w-80">
          <div className="flex justify-between gap-4">
            <div className="text-tertiary">Publishing to</div>
            <div className="font-bold text-secondary">Field Notes</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-tertiary whitespace-nowrap">Replying to</div>
            <a href={target.href} className="font-bold text-secondary truncate">
              {target.title}
            </a>
          </div>
        </div>
      </Case>
    </div>
  );
}
