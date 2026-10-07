"use client";
import React, { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Radio } from "components/Checkbox";
import { Input } from "components/Input";
import { CloseTiny } from "components/Icons/CloseTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { StandardSitePostItemView } from "components/Blocks/StandardSitePostBlock/StandardSitePostItem";
import { PublicationThemeWrapper } from "components/ThemeManager/PublicationThemeProvider";
import type { DocumentReply } from "src/documentReplies";
import {
  DEFAULT_REPLY_BUTTON_TEXT,
  DEFAULT_REPLY_PROMPT_TEXT,
} from "./constants";

export type ReplyCandidate = {
  // at-uri of one of the viewer's own documents
  uri: string;
  title: string;
  date?: React.ReactNode;
  publication?: { name: string };
};

// Local draft of a committed string: one undo step per edit rather than per
// keystroke.
function useCommittedText(value: string, onCommit: (text: string) => void) {
  let [text, setText] = useState(value);
  let [committed, setCommitted] = useState(value);
  if (value !== committed) {
    setCommitted(value);
    setText(value);
  }
  return {
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setText(e.currentTarget.value),
    onBlur: () => text !== value && onCommit(text),
    onKeyDown: (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      // The selected block's window-level key handlers treat keys in an
      // empty input as block commands (Backspace deletes the block).
      e.stopPropagation();
      if (e.key === "Enter") e.currentTarget.blur();
    },
  };
}

export function ReplyButtonTextInput(props: {
  value: string;
  onCommit: (text: string) => void;
}) {
  return (
    <Input
      aria-label="Reply button text"
      className="max-w-full min-w-24 px-2 py-0.5 rounded-md bg-accent-1 border border-accent-1 text-accent-2 font-bold text-center placeholder:text-accent-2 placeholder:opacity-60 outline-2 outline-transparent outline-offset-1 focus:outline-accent-1 hover:outline-accent-1 [field-sizing:content]"
      placeholder={DEFAULT_REPLY_BUTTON_TEXT}
      maxLength={50}
      {...useCommittedText(props.value, props.onCommit)}
    />
  );
}

export function ReplyPromptTextInput(props: {
  value: string;
  onCommit: (text: string) => void;
}) {
  let input = useCommittedText(props.value, props.onCommit);
  let shared = `[grid-area:1/1] whitespace-pre-wrap wrap-anywhere ${PROMPT_CLASS}`;
  return (
    <div className="grid">
      {/* Sizes the textarea to its text, or to the placeholder it shows. */}
      <div aria-hidden className={`${shared} invisible`}>
        {input.value || DEFAULT_REPLY_PROMPT_TEXT}{" "}
      </div>
      <textarea
        aria-label="Reply prompt text"
        className={`${shared} w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-tertiary`}
        rows={1}
        placeholder={DEFAULT_REPLY_PROMPT_TEXT}
        maxLength={300}
        {...input}
      />
    </div>
  );
}

const PROMPT_CLASS = "text-xl font-bold text-center text-primary";

// Above the replies: the author's prompt to readers as a heading, with
// whatever acts on the block centered under it.
function RepliesHeader(props: {
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  if (!props.prompt && !props.action) return null;
  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {props.prompt && (
        <h2 className={`w-full ${PROMPT_CLASS}`}>{props.prompt}</h2>
      )}
      {props.action && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {props.action}
        </div>
      )}
    </div>
  );
}

// Summarizes a document's replies and, once there are some, opens the full
// list. `replies` is undefined while they load. Every state is as tall as the
// button so the row never changes height.
export function RepliesStatusToggle(props: {
  replies: DocumentReply[] | undefined;
  canModerate: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  let total = props.replies?.length ?? 0;
  if (total === 0)
    return (
      <div className="py-0.5 border border-transparent text-tertiary italic">
        {props.replies ? "No replies yet" : "\u00a0"}
      </div>
    );
  let pending = props.replies?.filter((r) => !r.visible).length ?? 0;
  return (
    <ButtonSecondary aria-expanded={props.open} onClick={props.onToggle}>
      {props.canModerate && pending > 0
        ? `${pending} pending · ${total - pending} visible`
        : `${total} ${total === 1 ? "reply" : "replies"}`}
      <ArrowDownTiny className={props.open ? "rotate-180" : ""} />
    </ButtonSecondary>
  );
}

export function RepliesDraft(props: {
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <RepliesHeader prompt={props.prompt} action={props.action} />
      <div className="light-container text-sm italic text-tertiary text-center p-3 sm:p-4">
        <div className="text-base font-bold">Replies open when you publish</div>
        Readers can submit their own posts as replies. You choose which ones
        appear here.
      </div>
    </div>
  );
}

function ReplyPost(props: {
  post: DocumentReply["post"];
  showTheme?: boolean;
}) {
  return (
    <PublicationThemeWrapper
      postRecord={props.post.record}
      pubRecord={props.post.publication?.record ?? undefined}
      enabled={!!props.showTheme}
    >
      <div className={props.showTheme ? "bg-bg-page" : ""}>
        <StandardSitePostItemView
          post={props.post}
          size="small"
          hideInteractions
        />
      </div>
    </PublicationThemeWrapper>
  );
}

export function RepliesList(props: {
  replies: DocumentReply[];
  showThemes?: boolean;
  prompt?: React.ReactNode;
  action?: React.ReactNode;
  onWithdraw?: (uri: string) => void;
}) {
  let { onWithdraw } = props;
  return (
    <div className="flex flex-col gap-5">
      <RepliesHeader prompt={props.prompt} action={props.action} />
      {props.replies.length > 0 && (
        <div className="flex flex-col gap-2">
          {props.replies.map((reply) => (
            <div
              key={reply.uri}
              className="relative transparent-container overflow-hidden"
            >
              <ReplyPost post={reply.post} showTheme={props.showThemes} />
              {!reply.visible && (
                <div className="absolute top-2 right-3 z-[2] flex items-center gap-2 text-sm text-tertiary">
                  <span className="italic">Pending approval</span>
                  {onWithdraw && (
                    <button
                      aria-label="Withdraw reply"
                      className="hover:text-accent-contrast"
                      onClick={() => onWithdraw(reply.uri)}
                    >
                      <CloseTiny />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReplyPicker(props: {
  candidates: ReplyCandidate[];
  submitting?: boolean;
  onSubmit: (reply: { uri: string } | { url: string }) => void;
}) {
  let [url, setUrl] = useState("");
  let [selected, setSelected] = useState<string | null>(null);
  let canSubmit = !!url.trim() || !!selected;
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
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {props.candidates.map((c) => (
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
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-sm text-tertiary">
          Shown once the author approves it
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

export function RepliesModeration(props: {
  replies: DocumentReply[];
  showThemes?: boolean;
  // A visibility change is being published
  busy?: boolean;
  onAccept: (uri: string) => void;
  onHide: (uri: string) => void;
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  let pending = props.replies.filter((r) => !r.visible);
  let visible = props.replies.filter((r) => r.visible);

  let section = (label: string, items: DocumentReply[]) =>
    items.length > 0 && (
      <div className="flex flex-col gap-1">
        <div className="px-3 text-sm font-bold text-tertiary uppercase">
          {label} ({items.length})
        </div>
        {items.map((reply) => (
          <div
            key={reply.uri}
            className={`flex items-center gap-2 pr-3 ${props.showThemes ? "pl-2" : ""}`}
          >
            <div className="relative grow min-w-0 rounded-md overflow-hidden">
              <ReplyPost post={reply.post} showTheme={props.showThemes} />
            </div>
            <div className="w-16 shrink-0 flex justify-end">
              {reply.visible ? (
                <ButtonSecondary
                  compact
                  disabled={props.busy}
                  onClick={() => props.onHide(reply.uri)}
                >
                  Hide
                </ButtonSecondary>
              ) : (
                <ButtonPrimary
                  compact
                  disabled={props.busy}
                  onClick={() => props.onAccept(reply.uri)}
                >
                  Accept
                </ButtonPrimary>
              )}
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <RepliesHeader prompt={props.prompt} action={props.action} />
      {props.replies.length === 0 ? (
        <div className="light-container text-sm italic text-tertiary text-center p-3">
          No one has replied yet. Submissions will show up here for you to
          accept.
        </div>
      ) : (
        <div className="light-container flex flex-col gap-2 py-2">
          {section("Pending", pending)}
          {pending.length > 0 && visible.length > 0 && (
            <hr className="border-border-light" />
          )}
          {section("Visible", visible)}
        </div>
      )}
    </div>
  );
}
