"use client";
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
