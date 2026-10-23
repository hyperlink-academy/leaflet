"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { useModalBack } from "components/Modal";
import { PubIcon } from "components/ActionBar/Publications";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { resultListKey, stepHighlight } from "components/Combobox";
import { mainSiteAuthBase } from "src/utils/customDomain";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { AtUri } from "@atproto/syntax";
import type { Json } from "supabase/database.types";
import { Err, type Result } from "src/result";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";

export type ReplyCandidate = {
  // at-uri of one of the viewer's own documents
  uri: string;
  title: string;
  date?: React.ReactNode;
  publication?: { name: string };
  submitted?: boolean;
};

export type ReplyPublication = {
  uri: string;
  name: string;
  record: Json | null;
};

const VISIBLE_ROWS = 5;
const ROW_HEIGHT_PX = 48;

export function ReplyPicker(props: {
  candidates: ReplyCandidate[];
  publications?: ReplyPublication[];
  submitting?: boolean;
  onSubmit: (uri: string) => void;
  // Looks up a pasted link to one of the viewer's posts; errors are messages
  // to show in its place.
  resolveLink: (url: string) => Promise<Result<ReplyCandidate, string>>;
  onCreateDraft: (publication_uri: string | null) => Promise<void>;
}) {
  let [query, setQuery] = useState("");
  let [submitted, setSubmitted] = useState<string | null>(null);
  let [highlighted, setHighlighted] = useState<string | null>(null);
  let [choosingPublication, setChoosingPublication] = useState(false);
  let listId = useId();
  let loading = props.publications === undefined;
  let trimmed = query.trim();
  let pastedUrl = isUrl(trimmed) ? trimmed : null;
  let link = useResolvedLink(pastedUrl, props.resolveLink);

  if (choosingPublication)
    return (
      <ReplyPublicationSelector
        publications={props.publications ?? []}
        onBack={() => setChoosingPublication(false)}
        onCreateDraft={props.onCreateDraft}
      />
    );

  let matches = props.candidates.filter((c) =>
    c.title.toLowerCase().includes(trimmed.toLowerCase()),
  );
  let rows = pastedUrl ? (link?.ok ? [link.value] : []) : matches;
  let selectable = rows.filter((c) => !c.submitted);
  // Falls back to the first selectable row whenever the highlighted one is
  // filtered out, so Enter always picks something visible.
  let active =
    selectable.find((c) => c.uri === highlighted) ?? selectable[0] ?? null;
  let optionId = (uri: string) =>
    `${listId}-${rows.findIndex((c) => c.uri === uri)}`;
  let submit = (uri: string) => {
    if (props.submitting) return;
    setSubmitted(uri);
    props.onSubmit(uri);
  };
  let row = (c: ReplyCandidate) => (
    <ReplyCandidateRow
      key={c.uri}
      id={optionId(c.uri)}
      candidate={c}
      highlighted={active?.uri === c.uri}
      disabled={!!props.submitting}
      pending={!!props.submitting && submitted === c.uri}
      onHover={() => !c.submitted && setHighlighted(c.uri)}
      onClick={() => submit(c.uri)}
    />
  );
  let message = (content: React.ReactNode) => (
    <div className="m-auto text-sm text-tertiary text-center px-4">
      {content}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full sm:w-96">
      <div className="flex flex-col gap-0.5 leading-snug">
        <h3 className="text-primary">Reply with a Post</h3>
        <p className="text-secondary text-sm">
          Submit a blog post you've written as a reply to this one. The reply
          will show once the author approves it.
        </p>
      </div>
      <ButtonSecondary
        fullWidth
        disabled={loading || props.submitting}
        onClick={() => setChoosingPublication(true)}
      >
        Write a reply post <GoToArrowLined />
      </ButtonSecondary>
      <hr className="border-border-light" />
      <div className="flex flex-col gap-2">
        <Input
          autoFocus
          className="postSearch input-with-border w-full px-2!"
          placeholder="Search your post or paste a link"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            let action = resultListKey(e.key);
            if (!action) return;
            e.preventDefault();
            if (action === "select") {
              if (active) submit(active.uri);
            } else {
              let uris = selectable.map((c) => c.uri);
              setHighlighted(stepHighlight(uris, active?.uri, action) ?? null);
            }
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={active ? optionId(active.uri) : undefined}
        />
        <div
          id={listId}
          role="listbox"
          className="postSearchResults flex flex-col overflow-y-auto gap-0.5"
          style={{ height: VISIBLE_ROWS * ROW_HEIGHT_PX }}
        >
          {pastedUrl
            ? !link
              ? message(<Spinner />)
              : link.ok
                ? row(link.value)
                : message(link.error)
            : matches.length > 0
              ? matches.map(row)
              : message(
                  loading ? (
                    <Spinner />
                  ) : props.candidates.length === 0 ? (
                    "You haven't published any posts yet."
                  ) : (
                    "No posts match that title."
                  ),
                )}
        </div>
      </div>
    </div>
  );
}

function Spinner(props: { className?: string }) {
  return (
    <LoadingTiny className={`animate-spin shrink-0 ${props.className ?? ""}`} />
  );
}

function isUrl(text: string) {
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

// The resolved link once the lookup for the current `url` settles, so a slow
// lookup for an earlier paste can't show in place of the latest one.
function useResolvedLink(
  url: string | null,
  resolve: (url: string) => Promise<Result<ReplyCandidate, string>>,
) {
  let [resolved, setResolved] = useState<{
    url: string;
    result: Result<ReplyCandidate, string>;
  } | null>(null);
  let resolveRef = useRef(resolve);
  resolveRef.current = resolve;
  useEffect(() => {
    if (!url) return;
    let stale = false;
    // Debounced so typing a URL out doesn't look up every prefix of it.
    let handler = setTimeout(async () => {
      let result = await resolveRef
        .current(url)
        .catch(() => Err("Something went wrong."));
      if (!stale) setResolved({ url, result });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(handler);
    };
  }, [url]);
  return resolved?.url === url ? resolved.result : undefined;
}

function ReplyCandidateRow(props: {
  id: string;
  candidate: ReplyCandidate;
  highlighted: boolean;
  disabled: boolean;
  pending: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  let c = props.candidate;
  let ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (props.highlighted) ref.current?.scrollIntoView({ block: "nearest" });
  }, [props.highlighted]);
  return (
    <button
      ref={ref}
      id={props.id}
      type="button"
      role="option"
      aria-selected={props.highlighted}
      aria-disabled={c.submitted}
      tabIndex={-1}
      className={`menuItem shrink-0 items-center justify-between disabled:cursor-not-allowed! ${c.submitted ? "text-tertiary! hover:bg-bg-light!" : ""} ${props.highlighted ? "bg-[var(--accent-light)]!" : ""}`}
      style={{ height: ROW_HEIGHT_PX }}
      disabled={props.disabled || c.submitted}
      onMouseMove={props.onHover}
      onClick={props.onClick}
    >
      <div className="flex flex-col min-w-0 w-full leading-snug">
        <div className="flex items-center gap-2 w-full">
          <span className="truncate grow min-w-0">{c.title}</span>
          {c.submitted && (
            <span className="shrink-0 text-sm font-normal italic">
              Submitted
            </span>
          )}
        </div>
        <span className="text-sm text-tertiary font-normal truncate">
          {c.publication?.name}
          {c.publication && c.date ? " · " : ""}
          {c.date}
        </span>
      </div>
      {props.pending && <Spinner />}
    </button>
  );
}

const LOOSELEAF = "looseleaf";

export function ReplyPublicationSelector(props: {
  publications: ReplyPublication[];
  onBack: () => void;
  onCreateDraft: (publication_uri: string | null) => Promise<void>;
}) {
  let [creating, setCreating] = useState<string | null>(null);
  useModalBack(creating ? null : props.onBack);
  let create = async (option: string) => {
    if (creating) return;
    setCreating(option);
    try {
      await props.onCreateDraft(option === LOOSELEAF ? null : option);
    } finally {
      setCreating(null);
    }
  };
  let optionClass =
    "flex gap-2 menuItem font-bold text-secondary disabled:cursor-not-allowed!";
  let pending = (option: string) =>
    creating === option && <Spinner className="ml-auto mt-0.5" />;
  return (
    <div className="flex flex-col gap-2 w-full sm:w-96">
      <div className="font-bold text-secondary">Reply with…</div>
      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
        <button
          type="button"
          className={optionClass}
          disabled={!!creating}
          onClick={() => create(LOOSELEAF)}
        >
          <LooseLeafSmall className="shrink-0" />
          <div className="flex flex-col min-w-0 leading-snug">
            <span className="truncate">Looseleaf</span>
            <span className="text-sm text-tertiary font-normal">
              A one off, not attached to a publication
            </span>
          </div>
          {pending(LOOSELEAF)}
        </button>
        {props.publications.length > 0 && (
          <hr className="border-border-light border-dashed my-1" />
        )}
        {props.publications.map((p) => {
          let record = normalizePublicationRecord(p.record);
          return (
            <button
              type="button"
              key={p.uri}
              className={optionClass}
              disabled={!!creating}
              onClick={() => create(p.uri)}
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
              {pending(p.uri)}
            </button>
          );
        })}
      </div>
      {props.publications.length === 0 && (
        <a className="text-sm" href={`${mainSiteAuthBase()}/lish/createPub`}>
          Don't have a blog yet? Start one with Leaflet!
        </a>
      )}
    </div>
  );
}
