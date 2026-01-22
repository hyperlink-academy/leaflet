"use client";
import { createContext, useContext } from "react";
import type { PostPageData } from "app/lish/[did]/[publication]/[rkey]/getPostPageData";

// Derive types from PostPageData
type NonNullPostPageData = NonNullable<PostPageData>;
export type PublicationContext = NonNullPostPageData["publication"];
export type CommentOnDocument = NonNullPostPageData["comments"][number];
export type DocumentMention = NonNullPostPageData["mentions"][number];
export type QuotesAndMentions = NonNullPostPageData["quotesAndMentions"];

export type DocumentContextValue = Pick<
  NonNullPostPageData,
  | "uri"
  | "normalizedDocument"
  | "normalizedPublication"
  | "theme"
  | "prevNext"
  | "quotesAndMentions"
  | "publication"
  | "comments"
  | "mentions"
  | "leafletId"
>;

const DocumentContext = createContext<DocumentContextValue | null>(null);

export function useDocument() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocument must be used within DocumentProvider");
  return ctx;
}

export function useDocumentOptional() {
  return useContext(DocumentContext);
}

export function DocumentProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DocumentContextValue;
}) {
  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}
