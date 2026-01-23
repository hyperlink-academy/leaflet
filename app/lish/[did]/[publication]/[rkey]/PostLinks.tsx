"use client";
import { AppBskyFeedDefs } from "@atproto/api";
import { preload } from "swr";
import { openPage, OpenPage } from "./PostPages";

type ThreadViewPost = AppBskyFeedDefs.ThreadViewPost;
type NotFoundPost = AppBskyFeedDefs.NotFoundPost;
type BlockedPost = AppBskyFeedDefs.BlockedPost;
type ThreadType = ThreadViewPost | NotFoundPost | BlockedPost;

type PostView = AppBskyFeedDefs.PostView;

export interface QuotesResponse {
  uri: string;
  cid?: string;
  cursor?: string;
  posts: PostView[];
}

// Thread fetching
export const getThreadKey = (uri: string) => `thread:${uri}`;

export async function fetchThread(uri: string): Promise<ThreadType> {
  const params = new URLSearchParams({ uri });
  const response = await fetch(`/api/bsky/thread?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch thread");
  }

  return response.json();
}

export const prefetchThread = (uri: string) => {
  preload(getThreadKey(uri), () => fetchThread(uri));
};

// Quotes fetching
export const getQuotesKey = (uri: string) => `quotes:${uri}`;

export async function fetchQuotes(uri: string): Promise<QuotesResponse> {
  const params = new URLSearchParams({ uri });
  const response = await fetch(`/api/bsky/quotes?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch quotes");
  }

  return response.json();
}

export const prefetchQuotes = (uri: string) => {
  preload(getQuotesKey(uri), () => fetchQuotes(uri));
};

// Link component for opening thread pages with prefetching
export function ThreadLink(props: {
  threadUri: string;
  parent?: OpenPage;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { threadUri, parent, children, className, onClick } = props;

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    openPage(parent, { type: "thread", uri: threadUri });
  };

  const handlePrefetch = () => {
    prefetchThread(threadUri);
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onPointerDown={handlePrefetch}
    >
      {children}
    </button>
  );
}

// Link component for opening quotes pages with prefetching
export function QuotesLink(props: {
  postUri: string;
  parent?: OpenPage;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { postUri, parent, children, className, onClick } = props;

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    openPage(parent, { type: "quotes", uri: postUri });
  };

  const handlePrefetch = () => {
    prefetchQuotes(postUri);
  };
  return (
    <button
      className={className}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onPointerDown={handlePrefetch}
    >
      {children}
    </button>
  );
}
