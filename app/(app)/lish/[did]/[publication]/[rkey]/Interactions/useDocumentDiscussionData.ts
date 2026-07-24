"use client";
import useSWR from "swr";
import { AtUri } from "@atproto/api";
import { callRPC } from "app/api/rpc/client";
import type { DocumentContextValue } from "contexts/DocumentContext";
import {
  getDocumentPages,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import type { Comment } from "./Comments";

type DocumentInteractionsData = {
  comments: Comment[];
  quotesAndMentions: { uri: string; link?: string }[];
  document: NormalizedDocument | null;
  publication: NormalizedPublication | null;
};

// Fetches a document's comments and Bluesky mentions and builds the Document /
// LeafletContent context values that the shared drawer content (Comments /
// Quotes) reads off `useDocument`. Used by the DiscussionModal and the
// standard-site-post drawer view, which both render another document's
// discussion outside of that document's own post page.
export function useDocumentDiscussionData(
  document_uri: string,
  enabled: boolean,
) {
  const swr = useSWR(enabled ? ["doc_interactions", document_uri] : null, () =>
    callRPC("get_document_interactions", { document_uri }),
  );
  const data = swr.data as unknown as DocumentInteractionsData | undefined;

  let did = "";
  try {
    did = new AtUri(document_uri).host;
  } catch {
    did = "";
  }

  const documentRecord = data?.document ?? null;
  const pages = documentRecord ? (getDocumentPages(documentRecord) ?? []) : [];

  const commentsCountByPage: Record<string, number> = {};
  for (const c of data?.comments ?? []) {
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
        commentsCount: data?.comments.length ?? 0,
        commentsCountByPage,
        mentions: [],
        leafletId: null,
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
