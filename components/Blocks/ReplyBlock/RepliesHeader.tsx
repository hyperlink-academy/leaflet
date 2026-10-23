"use client";
import React, { useState } from "react";
import { Input } from "components/Input";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import {
  DEFAULT_REPLY_BUTTON_TEXT,
  DEFAULT_REPLY_PROMPT_TEXT,
} from "./constants";

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
      e.stopPropagation();
      if (e.key === "Enter") e.currentTarget.blur();
    },
  };
}

export function ReplyButtonTextInput(props: {
  value: string;
  onCommit: (text: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <Input
      aria-label={props.label ?? "Reply button text"}
      className="max-w-full min-w-24 px-2 py-0.5 rounded-md bg-accent-1 border border-accent-1 text-accent-2 font-bold text-center placeholder:text-accent-2 placeholder:opacity-60 outline-2 outline-transparent outline-offset-1 focus:outline-accent-1 hover:outline-accent-1 [field-sizing:content]"
      placeholder={props.placeholder ?? DEFAULT_REPLY_BUTTON_TEXT}
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

const PROMPT_CLASS = "text-lg font-bold text-center text-primary";

export function RepliesHeader(props: {
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  if (!props.prompt && !props.action) return null;
  return (
    <div className="flex flex-col items-center gap-2 pb-1">
      {props.prompt && (
        <h3 className={`w-full ${PROMPT_CLASS}`}>{props.prompt}</h3>
      )}
      {props.action && (
        <div className="max-w-full w-fit mx-auto">{props.action}</div>
      )}
    </div>
  );
}

export function PendingRepliesHeader(props: {
  pending: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-expanded={props.open}
      className="flex items-center gap-2 w-full text-sm font-bold text-tertiary hover:text-accent-contrast"
      onClick={props.onToggle}
    >
      <hr className="grow border-border-light" />
      <span className="flex items-center gap-1 shrink-0 uppercase">
        Pending ({props.pending})
        <ArrowDownTiny className={props.open ? "" : "rotate-90"} />
      </span>
      <hr className="grow border-border-light" />
    </button>
  );
}

export function AcceptedRepliesHeader(props: { accepted: number }) {
  return (
    <div className="flex items-center gap-2 w-full text-sm font-bold text-tertiary">
      <hr className="grow border-border-light" />
      <span className="shrink-0 uppercase">Replies ({props.accepted})</span>
      <hr className="grow border-border-light" />
    </div>
  );
}
