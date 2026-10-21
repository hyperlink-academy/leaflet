"use client";
import { Avatar } from "components/Avatar";
import type { InteractionAuthor } from "src/interactionAuthor";

export function authorDisplayName(author: InteractionAuthor) {
  return author.displayName || author.handle || "Someone";
}

// Handles tell people apart, so a list shows them once it has more than one
// person in it.
export function hasSeveralAuthors(authors: InteractionAuthor[]) {
  return new Set(authors.map((a) => a.did)).size > 1;
}

export function InteractionAuthorName(props: {
  author: InteractionAuthor;
  showHandle?: boolean;
}) {
  return (
    <>
      <span className="font-bold text-secondary truncate">
        {authorDisplayName(props.author)}
      </span>
      {props.showHandle && props.author.handle && (
        <span className="text-tertiary truncate">@{props.author.handle}</span>
      )}
    </>
  );
}

// Avatar and name on one line, for the head of an answer or a reply
export function InteractionAuthorLine(props: {
  author: InteractionAuthor;
  showHandle?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0 text-sm">
      <Avatar
        src={props.author.avatar}
        displayName={authorDisplayName(props.author)}
        size="small"
      />
      <InteractionAuthorName
        author={props.author}
        showHandle={props.showHandle}
      />
      {props.children}
    </div>
  );
}
