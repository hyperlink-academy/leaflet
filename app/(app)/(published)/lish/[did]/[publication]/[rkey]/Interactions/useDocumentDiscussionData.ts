"use client";
import useSWR, { preload } from "swr";
import { AtUri } from "@atproto/api";
import { callRPC } from "app/api/rpc/client";
import type { DocumentContextValue } from "contexts/DocumentContext";
import {
  getDocumentPages,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getDocumentURL } from "src/utils/getPublicationURL";
import type { Comment } from "./Comments";
import { prefetchQuotesData } from "./Quotes";
import { decodeQuotePosition } from "src/utils/quotePosition";

type DocumentInteractionsData = {
  comments: Comment[];
  quotesAndMentions: { uri: string; link?: string }[];
  document: NormalizedDocument | null;
  publication: NormalizedPublication | null;
};

const discussionKey = (document_uri: string) =>
  ["doc_interactions", document_uri] as const;
const fetchDiscussion = (document_uri: string) =>
  callRPC("get_document_interactions", { document_uri });

// The mentions that belong to one page of a document: the main page when
// `pageId` is undefined.
export function filterQuotesForPage(
  quotesAndMentions: { uri: string; link?: string }[],
  pageId: string | undefined,
) {
  return quotesAndMentions.filter((q) => {
    if (!q.link) return !pageId;
    const url = new URL(q.link);
    const quoteParam = url.pathname.split("/l-quote/")[1];
    if (!quoteParam) return !pageId;
    const quotePosition = decodeQuotePosition(quoteParam);
    return quotePosition?.pageId === pageId;
  });
}

// Warms the discussion, then the Bluesky posts its mentions tab hydrates. The
// page filter has to match the one the content applies, since the posts are
// cached by their exact uri list.
export async function prefetchDocumentDiscussion(
  document_uri: string,
  pageId?: string,
) {
  const res = await preload(discussionKey(document_uri), () =>
    fetchDiscussion(document_uri),
  );
  const data = res as unknown as DocumentInteractionsData | undefined;
  prefetchQuotesData(
    filterQuotesForPage(data?.quotesAndMentions ?? [], pageId),
  );
}

// Fetches a document's comments and Bluesky mentions and builds the Document /
// LeafletContent context values that the shared drawer content (Comments /
// Quotes) reads off `useDocument`. Used by the DiscussionModal and the
// standard-site-post drawer view, which both render another document's
// discussion outside of that document's own post page.
export function useDocumentDiscussionData(
  document_uri: string,
  enabled: boolean,
) {
  const swr = useSWR(enabled ? discussionKey(document_uri) : null, () =>
    fetchDiscussion(document_uri),
  );
  const data = swr.data as unknown as DocumentInteractionsData | undefined;

  let did = "";
  try {
    did = new AtUri(document_uri).host;
  } catch {
    did = "";
  }

  const documentRecord = data?.document ?? null;
  const pages = documentRecord ? getDocumentPages(documentRecord) ?? [] : [];

  const liveComments = (data?.comments ?? []).filter((c) => !c.deleted);
  const commentsCountByPage: Record<string, number> = {};
  for (const c of liveComments) {
    const onPage = (c.record as { onPage?: string } | null)?.onPage ?? "";
    commentsCountByPage[onPage] = (commentsCountByPage[onPage] ?? 0) + 1;
  }

  // The drawer content only reads uri / normalizedDocument / normalizedPublication
  // off the document context; the rest is filled with sensible defaults.
  const documentContextValue: DocumentContextValue | null = documentRecord
    ? ({
        uri: document_uri,
        normalizedDocument: documentRecord,
        normalizedPublication: data?.publication ?? null,
        postUrl: getDocumentURL(
          documentRecord,
          document_uri,
          data?.publication,
        ),
        theme: null,
        prevNext: null,
        quotesAndMentions: data?.quotesAndMentions ?? [],
        publication: null,
        commentsCount: liveComments.length,
        commentsCountByPage,
        mentions: [],
        recommendsCount: 0,
      } as unknown as DocumentContextValue)
    : null;

  const prefs = data?.publication?.preferences;

  return {
    isLoading: swr.isLoading,
    data,
    did,
    pages,
    documentContextValue,
    comments: (data?.comments ?? []) as Comment[],
    quotesAndMentions: data?.quotesAndMentions ?? [],
    showComments: prefs?.showComments !== false,
    showMentions: prefs?.showMentions !== false,
  };
}
