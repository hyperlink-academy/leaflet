import { create } from "zustand";
import { flushSync } from "react-dom";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { useParams, useSearchParams } from "next/navigation";
import { decodeQuotePosition } from "./quotePosition";
import { useEffect } from "react";

// Page types
export type DocPage = { type: "doc"; id: string };
export type ThreadPage = { type: "thread"; uri: string };
export type QuotesPage = { type: "quotes"; uri: string };
export type IframePage = { type: "iframe"; url: string };
export type OpenPage = DocPage | ThreadPage | QuotesPage | IframePage;

// Get a stable key for a page
export const getPageKey = (page: OpenPage): string => {
  if (page.type === "doc") return page.id;
  if (page.type === "quotes") return `quotes:${page.uri}`;
  if (page.type === "iframe") return `iframe:${page.url}`;
  return `thread:${page.uri}`;
};

const usePostPageUIState = create(() => ({
  pages: [] as OpenPage[],
  initialized: false,
}));

export const useOpenPages = (): OpenPage[] => {
  const { quote } = useParams();
  const state = usePostPageUIState((s) => s);
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");

  if (!state.initialized) {
    // Check for page search param first (for comment links)
    if (pageParam) {
      return [{ type: "doc", id: pageParam }];
    }
    // Then check for quote param
    if (quote) {
      const decodedQuote = decodeQuotePosition(quote as string);
      if (decodedQuote?.pageId) {
        return [{ type: "doc", id: decodedQuote.pageId }];
      }
    }
  }

  return state.pages;
};

export const useInitializeOpenPages = () => {
  const { quote } = useParams();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");

  useEffect(() => {
    const state = usePostPageUIState.getState();
    if (!state.initialized) {
      // Check for page search param first (for comment links)
      if (pageParam) {
        usePostPageUIState.setState({
          pages: [{ type: "doc", id: pageParam }],
          initialized: true,
        });
        return;
      }
      // Then check for quote param
      if (quote) {
        const decodedQuote = decodeQuotePosition(quote as string);
        if (decodedQuote?.pageId) {
          usePostPageUIState.setState({
            pages: [{ type: "doc", id: decodedQuote.pageId }],
            initialized: true,
          });
          return;
        }
      }
      // Mark as initialized even if no pageId found
      usePostPageUIState.setState({ initialized: true });
    }
  }, [quote, pageParam]);
};

export const openPage = (
  parent: OpenPage | undefined,
  page: OpenPage,
  options?: { scrollIntoView?: boolean },
) => {
  const pageKey = getPageKey(page);
  const parentKey = parent ? getPageKey(parent) : undefined;

  // Check if the page is already open
  const currentState = usePostPageUIState.getState();
  const existingPageIndex = currentState.pages.findIndex(
    (p) => getPageKey(p) === pageKey,
  );

  // If page is already open, just scroll to it
  if (existingPageIndex !== -1) {
    if (options?.scrollIntoView !== false) {
      scrollIntoView(`post-page-${pageKey}`);
    }
    return;
  }

  flushSync(() => {
    usePostPageUIState.setState((state) => {
      let parentPosition = state.pages.findIndex(
        (s) => getPageKey(s) === parentKey,
      );
      // Close any pages after the parent and add the new page
      return {
        pages:
          parentPosition === -1
            ? [page]
            : [...state.pages.slice(0, parentPosition + 1), page],
        initialized: true,
      };
    });
  });

  if (options?.scrollIntoView !== false) {
    // Use requestAnimationFrame to ensure the DOM has been painted before scrolling
    requestAnimationFrame(() => {
      scrollIntoView(`post-page-${pageKey}`);
    });
  }
};

export const closePage = (page: OpenPage) => {
  const pageKey = getPageKey(page);
  usePostPageUIState.setState((state) => {
    let parentPosition = state.pages.findIndex(
      (s) => getPageKey(s) === pageKey,
    );
    return {
      pages: state.pages.slice(0, parentPosition),
      initialized: true,
    };
  });
};
