"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { AtUri } from "@atproto/api";
import { Modal } from "./Modal";
import { ToggleGroup } from "./ToggleGroup";
import { SpeedyLink } from "./SpeedyLink";
import { ExternalLinkTiny } from "./Icons/ExternalLinkTiny";
import { DotLoader } from "./utils/DotLoader";
import { callRPC } from "app/api/rpc/client";
import {
  DocumentProvider,
  type DocumentContextValue,
} from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import {
  getDocumentPages,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import {
  CommentsDrawerContent,
  type Comment,
} from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/Comments";
import { MentionsDrawerContent } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/Quotes";
import { decodeQuotePosition } from "app/(app)/lish/[did]/[publication]/[rkey]/quotePosition";
import { GoToArrow } from "./Icons/GoToArrow";
import { ButtonPrimary } from "./Buttons";

type InteractionsData = {
  comments: Comment[];
  quotesAndMentions: { uri: string; link?: string }[];
  document: NormalizedDocument | null;
  publication: NormalizedPublication | null;
};

// A self-contained modal that renders a post's comments and Bluesky mentions
// with a toggle between them. Used from post listings, the reader feed, and
// page-link blocks where the full post page (and its interaction drawer) isn't
// mounted. It fetches everything it needs from get_document_interactions and
// provides the Document/LeafletContent contexts that the shared drawer content
// expects, so the post page's own drawer (#3) can stay untouched.
export function DiscussionModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document_uri: string;
  postUrl: string;
  title?: string;
  commentsCount: number;
  quotesCount: number;
  showComments: boolean;
  showMentions: boolean;
  pageId?: string;
}) {
  const did = new AtUri(props.document_uri).host;

  const commentsAvailable = props.showComments && props.commentsCount > 0;
  const mentionsAvailable = props.showMentions && props.quotesCount > 0;
  const bothAvailable = commentsAvailable && mentionsAvailable;

  const [tab, setTab] = useState<"comments" | "quotes">(
    commentsAvailable ? "comments" : "quotes",
  );
  // Reset to the most relevant tab each time the modal is opened.
  useEffect(() => {
    if (props.open) setTab(commentsAvailable ? "comments" : "quotes");
  }, [props.open]);

  const swr = useSWR(
    props.open ? ["doc_interactions", props.document_uri] : null,
    () =>
      callRPC("get_document_interactions", {
        document_uri: props.document_uri,
      }),
  );
  const data = swr.data as unknown as InteractionsData | undefined;
  const isLoading = swr.isLoading;

  // Restrict mentions to the page this modal is about (mirrors InteractionDrawer).
  const quotesAndMentions = (data?.quotesAndMentions ?? []).filter((q) => {
    if (!q.link) return !props.pageId;
    const url = new URL(q.link);
    const quoteParam = url.pathname.split("/l-quote/")[1];
    if (!quoteParam) return !props.pageId;
    const quotePosition = decodeQuotePosition(quoteParam);
    return quotePosition?.pageId === props.pageId;
  });

  const documentRecord = data?.document as
    | NormalizedDocument
    | null
    | undefined;
  const pages = documentRecord ? getDocumentPages(documentRecord) ?? [] : [];

  // The drawer content only reads uri / normalizedDocument / normalizedPublication
  // off the document context; the rest is filled with sensible defaults.
  const documentContextValue: DocumentContextValue | null = documentRecord
    ? ({
        uri: props.document_uri,
        normalizedDocument: documentRecord,
        normalizedPublication: (data?.publication ??
          null) as NormalizedPublication | null,
        theme: null,
        prevNext: null,
        quotesAndMentions: data?.quotesAndMentions ?? [],
        publication: null,
        commentsCount: data?.comments.length ?? props.commentsCount,
        mentions: [],
        leafletId: null,
        recommendsCount: 0,
      } as unknown as DocumentContextValue)
    : null;

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="p-0! pb-4 gap-0 sm:w-lg max-w-full"
    >
      <div className="flex flex-col px-3 pt-2 -mb-1 ">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-tertiary ">
            {bothAvailable
              ? "Discussion on"
              : commentsAvailable
                ? "Comments on"
                : "Bluesky Mentions about"}
          </div>
          <SpeedyLink
            href={props.postUrl}
            className="shrink-0 hover:no-underline!"
          >
            <ButtonPrimary compact className="text-sm">
              Full Post <GoToArrow />
            </ButtonPrimary>
          </SpeedyLink>
        </div>
        <h3 className="line-clamp-1 min-w-0 text-primary">
          {props.title || "Post"}
        </h3>
      </div>

      {bothAvailable && (
        <div className="sticky top-0 z-10 px-3 pt-3">
          <ToggleGroup
            fullWidth
            value={tab}
            onChange={(value) => setTab(value)}
            options={[
              {
                value: "comments",
                label:
                  props.commentsCount > 0
                    ? `Comments (${props.commentsCount})`
                    : "Comments",
              },
              {
                value: "quotes",
                label: (
                  <div>
                    Bluesky <span className="hidden sm:inline">Mentions</span>{" "}
                    {props.quotesCount > 0 && `(${props.quotesCount})`}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      <div className="px-3 pb-3 pt-4">
        {!data && isLoading ? (
          <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
            <span>loading</span>
            <DotLoader />
          </div>
        ) : documentContextValue ? (
          <LeafletContentProvider value={{ pages }}>
            <DocumentProvider value={documentContextValue}>
              {tab === "comments" ? (
                <CommentsDrawerContent
                  document_uri={props.document_uri}
                  comments={(data?.comments ?? []) as Comment[]}
                  pageId={props.pageId}
                />
              ) : (
                <MentionsDrawerContent
                  did={did}
                  quotesAndMentions={quotesAndMentions}
                />
              )}
            </DocumentProvider>
          </LeafletContentProvider>
        ) : null}
      </div>
    </Modal>
  );
}
