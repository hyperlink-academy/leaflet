"use client";
import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { ToggleGroup } from "./ToggleGroup";
import { SpeedyLink } from "./SpeedyLink";
import { DotLoader } from "./utils/DotLoader";
import { DocumentProvider } from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { CommentsDrawerContent } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/Comments";
import { MentionsDrawerContent } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/Quotes";
import { decodeQuotePosition } from "app/(app)/lish/[did]/[publication]/[rkey]/quotePosition";
import { useDocumentDiscussionData } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/useDocumentDiscussionData";
import { GoToArrow } from "./Icons/GoToArrow";
import { ButtonPrimary } from "./Buttons";
import { StandardSitePostItem } from "./Blocks/StandardSitePostBlock/StandardSitePostItem";

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

  const { isLoading, data, did, pages, documentContextValue, comments } =
    useDocumentDiscussionData(props.document_uri, props.open);

  // Restrict mentions to the page this modal is about (mirrors InteractionDrawer).
  const quotesAndMentions = (data?.quotesAndMentions ?? []).filter((q) => {
    if (!q.link) return !props.pageId;
    const url = new URL(q.link);
    const quoteParam = url.pathname.split("/l-quote/")[1];
    if (!quoteParam) return !props.pageId;
    const quotePosition = decodeQuotePosition(quoteParam);
    return quotePosition?.pageId === props.pageId;
  });

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="px-3! pt-0! pb-4 gap-0 sm:w-lg max-w-full relative bg-[var(--color-bg-light)]!"
    >
      <div className="standardSitePostBlock block-border overflow-hidden w-full bg-bg-page my-3">
        <StandardSitePostItem
          pageWidth={448}
          uri={props.document_uri}
          size="small"
          hideInteractions
        />
      </div>
      <div className="discussionModalStickyHeader sticky top-0 z-10 bg-[var(--color-bg-light)]! -mx-3">
        <div className="flex items-center justify-between gap-3 pt-3 pb-2 px-3">
          {bothAvailable ? (
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
          ) : (
            <div className="font-bold text-tertiary text-sm! ">
              {commentsAvailable
                ? `Comments (${props.commentsCount})`
                : `Bluesky Mentions (${props.quotesCount})`}
            </div>
          )}{" "}
          <SpeedyLink
            href={props.postUrl}
            className="shrink-0 hover:no-underline!"
          >
            <ButtonPrimary className="text-sm py-[3px]! rounded-lg!">
              Full Post <GoToArrow />
            </ButtonPrimary>
          </SpeedyLink>
        </div>
        <hr className="border-border-light" />
      </div>
      <div className="pb-3 pt-4">
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
                  comments={comments}
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
