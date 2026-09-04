"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../Modal";
import { ToggleGroup } from "../ToggleGroup";
import { SpeedyLink } from "../SpeedyLink";
import { DotLoader } from "../utils/DotLoader";
import { DocumentProvider } from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { CommentsDrawerContent } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/Comments";
import { DiscussionDrawerContent } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/Quotes";
import {
  type DrawerThread,
  DrawerThreadContext,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
import { ThreadView } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/ThreadPage";
import { StandardSitePostDrawerView } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/StandardSitePostDrawerView";
import { RecommendsList } from "./RecommendsList";
import { decodeQuotePosition } from "src/utils/quotePosition";
import { useDocumentDiscussionData } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/useDocumentDiscussionData";
import { GoToArrow } from "../Icons/GoToArrow";
import { GoBackTiny } from "../Icons/GoBackTiny";
import { DoubleArrowRightTiny } from "../Icons/DoubleArrowRightTiny";
import { ButtonPrimary } from "../Buttons";
import { StandardSitePostItem } from "../Blocks/StandardSitePostBlock/StandardSitePostItem";

// A post's comments and Bluesky mentions with a toggle between them, fetching
// everything it needs from get_document_interactions and providing the
// Document/LeafletContent contexts the shared drawer content expects. Wrapped
// in a modal/sheet by DiscussionModal below (post listings, page-link blocks);
// the reader's post viewer renders it directly inside its own box instead, so
// opening discussions there swaps the box's content with no layout shift.
export function DiscussionContent(props: {
  open: boolean;
  document_uri: string;
  postUrl: string;
  title?: string;
  commentsCount: number;
  quotesCount: number;
  showComments: boolean;
  showMentions: boolean;
  pageId?: string;
  bgColor?: string;
  // Replaces the header's link to the post, for surfaces that already have it
  // on screen (the reader's post viewer) and need their own control instead.
  postLinkButton?: React.ReactNode;
}) {
  const commentsAvailable = props.showComments && props.commentsCount > 0;
  const mentionsAvailable = props.showMentions && props.quotesCount > 0;
  const bothAvailable = commentsAvailable && mentionsAvailable;

  const [tab, setTab] = useState<"comments" | "quotes">(
    commentsAvailable ? "comments" : "quotes",
  );

  useEffect(() => {
    if (props.open) setTab(commentsAvailable ? "comments" : "quotes");
  }, [props.open]);

  const { isLoading, data, did, pages, documentContextValue, comments } =
    useDocumentDiscussionData(props.document_uri, props.open);

  const [threadStack, setThreadStack] = useState<DrawerThread[]>([]);
  const drawerNav = useMemo(
    () => ({
      push: (thread: DrawerThread) =>
        setThreadStack((s) => {
          const top = s[s.length - 1];
          if (top && top.type === thread.type && top.uri === thread.uri)
            return s;
          return [...s, thread];
        }),
    }),
    [],
  );
  const activeThread = threadStack[threadStack.length - 1];

  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "nearest" });
  }, [threadStack.length]);

  const quotesAndMentions = (data?.quotesAndMentions ?? []).filter((q) => {
    if (!q.link) return !props.pageId;
    const url = new URL(q.link);
    const quoteParam = url.pathname.split("/l-quote/")[1];
    if (!quoteParam) return !props.pageId;
    const quotePosition = decodeQuotePosition(quoteParam);
    return quotePosition?.pageId === props.pageId;
  });

  return (
    <>
      <div ref={topRef} />
      {/* bg matches the surface it scrolls over: plain bg-page in the mobile
          sheet, the bg-light tint in the desktop modal (sm: aligns with the
          useIsMobile breakpoint). */}
      <div
        className={`discussionModalStickyHeader sticky top-0 z-10 bg-bg-page! ${props.bgColor ? props.bgColor : " sm:bg-[var(--color-bg-light)]!"} -mx-3`}
      >
        <div className="flex items-center justify-between gap-3 pt-3 pb-2 px-3">
          {activeThread ? (
            <div className="flex items-center gap-2">
              {threadStack.length >= 2 && (
                <button
                  className="text-tertiary hover:text-secondary shrink-0"
                  aria-label="Back to the top of the thread"
                  onClick={() => setThreadStack([])}
                >
                  <DoubleArrowRightTiny className="rotate-180" />
                </button>
              )}
              <button
                className="flex items-center gap-1 text-tertiary hover:text-secondary font-bold text-sm"
                onClick={() => setThreadStack((s) => s.slice(0, -1))}
              >
                <GoBackTiny /> Back
              </button>
            </div>
          ) : bothAvailable ? (
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
          {props.postLinkButton ?? (
            <SpeedyLink
              href={props.postUrl}
              className="shrink-0 hover:no-underline!"
            >
              <ButtonPrimary className="text-sm py-[3px]! rounded-lg!">
                <span className="sm:block hidden">Full </span>Post <GoToArrow />
              </ButtonPrimary>
            </SpeedyLink>
          )}
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
              <DrawerThreadContext.Provider value={drawerNav}>
                {activeThread?.type === "recommends" ? (
                  <RecommendsList documentUri={activeThread.uri} />
                ) : activeThread?.type === "standardSitePost" ? (
                  <StandardSitePostDrawerView
                    uri={activeThread.uri}
                    tab="comments"
                  />
                ) : activeThread ? (
                  <ThreadView
                    parentUri={activeThread.uri}
                    initialTab={
                      activeThread.type === "quotes" ? "quotes" : "replies"
                    }
                  />
                ) : tab === "comments" ? (
                  <CommentsDrawerContent
                    document_uri={props.document_uri}
                    comments={comments}
                    pageId={props.pageId}
                  />
                ) : (
                  <DiscussionDrawerContent
                    did={did}
                    quotesAndMentions={quotesAndMentions}
                  />
                )}
              </DrawerThreadContext.Provider>
            </DocumentProvider>
          </LeafletContentProvider>
        ) : null}
      </div>
    </>
  );
}

export function DiscussionModal(
  props: React.ComponentProps<typeof DiscussionContent> & {
    onOpenChange: (open: boolean) => void;
  },
) {
  return (
    <Modal
      sheetOnMobile
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="px-3! pt-0! pb-4 gap-0 sm:w-lg max-w-full relative bg-[var(--color-bg-light)]! h-[1000px]!"
      sheetClassName="px-3! pt-0!"
    >
      <div className="standardSitePostBlock block-border overflow-hidden w-full bg-bg-page my-3">
        <StandardSitePostItem
          pageWidth={448}
          uri={props.document_uri}
          size="small"
          hideInteractions
        />
      </div>
      <DiscussionContent {...props} />
    </Modal>
  );
}
