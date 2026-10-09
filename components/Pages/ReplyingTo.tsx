"use client";
import useSWR from "swr";
import { getReplyTarget } from "actions/replies";
import type { ReplyTarget } from "src/documentReplies";

export function useReplyTarget(subject: string | null | undefined) {
  return useSWR(subject ? ["reply_target", subject] : null, () =>
    getReplyTarget(subject!),
  ).data;
}

// Marks a draft as a reply to another post, linking to it.
export function ReplyingTo(props: {
  target: ReplyTarget | null | undefined;
  className?: string;
}) {
  if (!props.target) return null;
  return (
    <div
      className={`flex gap-1 items-baseline min-w-0 text-sm text-tertiary ${props.className ?? ""}`}
    >
      <span className="shrink-0">Replying to</span>
      <a
        href={props.target.href}
        target="_blank"
        className="font-bold truncate"
      >
        {props.target.title}
      </a>
    </div>
  );
}
