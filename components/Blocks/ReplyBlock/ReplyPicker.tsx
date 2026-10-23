"use client";
import React, { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Radio } from "components/Checkbox";
import { Input } from "components/Input";
import { PubIcon } from "components/ActionBar/Publications";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { DotLoader } from "components/utils/DotLoader";
import { mainSiteAuthBase } from "src/utils/customDomain";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { AtUri } from "@atproto/syntax";
import type { Json } from "supabase/database.types";

export type ReplyCandidate = {
  // at-uri of one of the viewer's own documents
  uri: string;
  title: string;
  date?: React.ReactNode;
  publication?: { name: string };
};

export type ReplyPublication = {
  uri: string;
  name: string;
  record: Json | null;
};

const MAX_REPLY_CANDIDATES = 3;

export function ReplyPicker(props: {
  candidates: ReplyCandidate[];
  publications?: ReplyPublication[];
  submitting?: boolean;
  onSubmit: (reply: { uri: string } | { url: string }) => void;
  onCreateDraft: (publication_uri: string | null) => Promise<void>;
}) {
  let [url, setUrl] = useState("");
  let [selected, setSelected] = useState<string | null>(null);
  let [choosingPublication, setChoosingPublication] = useState(false);
  let canSubmit = !!url.trim() || !!selected;
  let publications = props.publications ?? [];

  if (choosingPublication)
    return (
      <ReplyPublicationSelector
        publications={publications}
        onBack={() => setChoosingPublication(false)}
        onCreateDraft={props.onCreateDraft}
      />
    );

  return (
    <div className="flex flex-col gap-2 w-full sm:w-80 py-1">
      <div className="font-bold text-secondary">
        Reply with one of your posts
      </div>
      <Input
        className="input-with-border w-full text-sm"
        placeholder="Paste a link to your post…"
        value={url}
        onChange={(e) => {
          setUrl(e.currentTarget.value);
          setSelected(null);
        }}
      />
      {props.candidates.length > 0 && (
        <>
          <div className="text-sm text-tertiary">or pick a recent post</div>
          <div className="flex flex-col gap-2">
            {props.candidates.slice(0, MAX_REPLY_CANDIDATES).map((c) => (
              <Radio
                key={c.uri}
                name="reply-candidate"
                id={`reply-candidate-${c.uri}`}
                value={c.uri}
                checked={selected === c.uri}
                onChange={() => {
                  setSelected(c.uri);
                  setUrl("");
                }}
              >
                <div className="flex flex-col min-w-0 leading-snug">
                  <span className="truncate">{c.title}</span>
                  <span className="text-sm text-tertiary font-normal truncate">
                    {c.publication?.name}
                    {c.publication && c.date ? " · " : ""}
                    {c.date}
                  </span>
                </div>
              </Radio>
            ))}
          </div>
        </>
      )}
      {props.publications && (
        <ButtonSecondary
          compact
          className="w-fit"
          onClick={() => setChoosingPublication(true)}
        >
          Write a new post
        </ButtonSecondary>
      )}
      {props.publications && publications.length === 0 && (
        <a className="text-sm" href={`${mainSiteAuthBase()}/lish/createPub`}>
          Don't have a blog yet? Start one with Leaflet!
        </a>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-sm text-tertiary whitespace-nowrap">
          Shown after author approval
        </div>
        <ButtonPrimary
          disabled={!canSubmit || props.submitting}
          onClick={() =>
            props.onSubmit(selected ? { uri: selected } : { url: url.trim() })
          }
        >
          {props.submitting ? "Submitting…" : "Submit"}
        </ButtonPrimary>
      </div>
    </div>
  );
}

const LOOSELEAF = "looseleaf";

export function ReplyPublicationSelector(props: {
  publications: ReplyPublication[];
  onBack: () => void;
  onCreateDraft: (publication_uri: string | null) => Promise<void>;
}) {
  let [selected, setSelected] = useState<string | null>(
    props.publications.length === 0 ? LOOSELEAF : null,
  );
  let [creating, setCreating] = useState(false);
  let optionClass = (uri: string) =>
    `flex gap-2 items-center menuItem font-bold text-secondary ${selected === uri ? "bg-[var(--accent-light)]! outline! outline-offset-1! outline-accent-contrast!" : ""}`;
  return (
    <div className="flex flex-col gap-2 w-full sm:w-80 py-1">
      <div className="font-bold text-secondary">Write your reply as…</div>
      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
        <button
          className={optionClass(LOOSELEAF)}
          onClick={() => setSelected(LOOSELEAF)}
        >
          <LooseLeafSmall className="shrink-0" />
          <span className="truncate">Looseleaf</span>
        </button>
        {props.publications.length > 0 && (
          <hr className="border-border-light border-dashed" />
        )}
        {props.publications.map((p) => {
          let record = normalizePublicationRecord(p.record);
          return (
            <button
              key={p.uri}
              className={optionClass(p.uri)}
              onClick={() => setSelected(p.uri)}
            >
              <PubIcon
                icon={
                  record?.icon
                    ? blobRefToSrc(record.icon.ref, new AtUri(p.uri).host)
                    : undefined
                }
                pubName={p.name}
              />
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <ButtonSecondary compact onClick={props.onBack} disabled={creating}>
          Back
        </ButtonSecondary>
        <ButtonPrimary
          disabled={!selected || creating}
          onClick={async () => {
            if (!selected) return;
            setCreating(true);
            try {
              await props.onCreateDraft(
                selected === LOOSELEAF ? null : selected,
              );
            } finally {
              setCreating(false);
            }
          }}
        >
          {creating ? <DotLoader /> : "Start writing"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
