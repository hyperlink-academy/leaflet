"use client";
import { MentionsDrawerContent } from "./Quotes";
import {
  setInteractionState,
  useInteractionState,
  pushDrawerThread,
  popDrawerThread,
  popDrawerThreadToRoot,
} from "./Interactions";
import { SandwichSpacer } from "components/LeafletLayout";
import { decodeQuotePosition } from "../quotePosition";
import { CloseTiny } from "components/Icons/CloseTiny";
import { GoBackTiny } from "components/Icons/GoBackTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { ToggleGroup } from "components/ToggleGroup";
import { useDocument } from "contexts/DocumentContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { DrawerThread, DrawerThreadContext } from "./drawerThreadContext";
import { useDrawerOpen } from "./useDrawerOpen";
import { ThreadView } from "../ThreadPage";
import { StandardSitePostDrawerView } from "./StandardSitePostDrawerView";
import { useDocumentDiscussionData } from "./useDocumentDiscussionData";
import { useIsMobile } from "src/hooks/isMobile";
import { MobileSheet } from "components/MobileSheet";

export const InteractionDrawer = (props: {
  showPageBackground: boolean | undefined;
  document_uri: string;
  quotesAndMentions: { uri: string; link?: string }[];
  commentsSlot: React.ReactNode;
  did: string;
  pageId?: string;
}) => {
  // Reset the drawer's scroll to the top whenever we navigate between views, so
  // a pushed thread (or a back navigation) doesn't start scrolled partway down.
  const scrollRef = useRef<HTMLDivElement>(null);
  let { threadStack } = useInteractionState(props.document_uri);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [threadStack.length]);

  let isMobile = useIsMobile();

  // On mobile the drawer slides up from the bottom as a sheet instead of sitting
  // inline in the horizontal page sandwich. The content renders its own header
  // and close button, so the sheet supplies no title/chrome of its own. This
  // component only mounts while the drawer is open (gated in PostPages), so the
  // sheet is always open; closing it clears the drawer state.
  if (isMobile) {
    return (
      <MobileSheet
        open
        onOpenChange={(open) => {
          if (!open)
            setInteractionState(props.document_uri, { drawerOpen: false });
        }}
        id="interaction-drawer"
        contentRef={scrollRef}
      >
        <InteractionDrawerContent {...props} />
      </MobileSheet>
    );
  }

  return (
    <>
      <SandwichSpacer noWidth />
      <div className="snap-center h-full  flex z-10 shrink-0 sm:max-w-prose sm:w-full w-[calc(100vw-12px)]">
        <div
          ref={scrollRef}
          id="interaction-drawer"
          className={`relative h-full w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-6  overflow-scroll flex flex-col  ${props.showPageBackground ? "light-container rounded-l-none! rounded-r-lg! -ml-[1px]" : " opaque-container rounded-lg! sm:ml-4"}`}
        >
          <InteractionDrawerContent {...props} />
        </div>
      </div>
    </>
  );
};

const InteractionDrawerContent = (props: {
  showPageBackground: boolean | undefined;
  document_uri: string;
  quotesAndMentions: { uri: string; link?: string }[];
  commentsSlot: React.ReactNode;
  did: string;
  pageId?: string;
}) => {
  let drawer = useDrawerOpen(props.document_uri);
  if (!drawer) return null;

  let { commentsCountByPage } = useDocument();
  let commentsCount = commentsCountByPage[props.pageId ?? ""] ?? 0;
  let { threadStack } = useInteractionState(props.document_uri);
  const drawerNav = useMemo(
    () => ({
      push: (thread: DrawerThread) =>
        pushDrawerThread(props.document_uri, thread),
    }),
    [props.document_uri],
  );

  // The innermost thread/quotes view opened within the drawer, if any. When
  // present it replaces the comments/mentions tabs.
  const activeThread = threadStack[threadStack.length - 1];

  // A standard-site-post thread shows another post's own discussion. It's always
  // at the root of the stack (Bluesky threads opened from its mentions become
  // the active thread instead), so its comments/mentions toggle lives in the
  // drawer header in place of a Back button. Its data is fetched here too (SWR
  // dedupes with the view below) to drive that toggle.
  const sspUri =
    activeThread?.type === "standardSitePost" ? activeThread.uri : null;
  const ssp = useDocumentDiscussionData(sspUri ?? "", !!sspUri);
  const [sspTab, setSspTab] = useState<"comments" | "quotes">("comments");
  useEffect(() => {
    setSspTab("comments");
  }, [sspUri]);

  const sspCommentsAvailable = ssp.showComments && ssp.comments.length > 0;
  const sspMentionsAvailable =
    ssp.showMentions && ssp.quotesAndMentions.length > 0;
  const sspBothAvailable = sspCommentsAvailable && sspMentionsAvailable;
  let sspActiveTab: "comments" | "quotes" = sspTab;
  if (sspActiveTab === "comments" && !sspCommentsAvailable)
    sspActiveTab = "quotes";
  if (sspActiveTab === "quotes" && !sspMentionsAvailable)
    sspActiveTab = "comments";

  const filteredQuotesAndMentions = props.quotesAndMentions.filter((q) => {
    if (!q.link) return !props.pageId; // Direct mentions without quote context go to main page
    const url = new URL(q.link);
    const quoteParam = url.pathname.split("/l-quote/")[1];
    if (!quoteParam) return !props.pageId;
    const quotePosition = decodeQuotePosition(quoteParam);
    return quotePosition?.pageId === props.pageId;
  });

  // commentsSlot is null when comments are disabled by permissions; mentions
  // are only available when there's something to show on this page.
  const commentsAvailable = props.commentsSlot != null;
  const mentionsAvailable = filteredQuotesAndMentions.length > 0;
  const bothAvailable = commentsAvailable && mentionsAvailable;

  // Resolve the active tab, falling back to whichever option is available.
  let activeTab: "comments" | "quotes" =
    drawer.drawer === "quotes" ? "quotes" : "comments";
  if (activeTab === "comments" && !commentsAvailable) activeTab = "quotes";
  if (activeTab === "quotes" && !mentionsAvailable) activeTab = "comments";
  return (
    <>
      <div className="w-full flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {sspUri ? (
            sspBothAvailable ? (
              <ToggleGroup
                fullWidth
                value={sspActiveTab}
                onChange={(value, e) => {
                  e?.preventDefault();
                  setSspTab(value);
                }}
                options={[
                  {
                    value: "comments",
                    label:
                      ssp.comments.length > 0
                        ? `Comments (${ssp.comments.length})`
                        : "Comments",
                  },
                  {
                    value: "quotes",
                    label: (
                      <div>
                        Bluesky{" "}
                        <span className="hidden sm:inline">Mentions</span>{" "}
                        {ssp.quotesAndMentions.length > 0 &&
                          `(${ssp.quotesAndMentions.length})`}
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <h4>
                {sspActiveTab === "quotes"
                  ? `Bluesky Mentions${ssp.quotesAndMentions.length > 0 ? ` (${ssp.quotesAndMentions.length})` : ""}`
                  : `Comments${ssp.comments.length > 0 ? ` (${ssp.comments.length})` : ""}`}
              </h4>
            )
          ) : activeThread ? (
            <div className="flex items-center gap-2">
              {threadStack.length >= 2 && (
                <button
                  className="text-tertiary hover:text-secondary shrink-0"
                  aria-label="Back to the top of the thread"
                  onClick={() => popDrawerThreadToRoot(props.document_uri)}
                >
                  <DoubleArrowRightTiny className="rotate-180" />
                </button>
              )}
              <button
                className="flex items-center gap-1 text-tertiary hover:text-secondary font-bold text-sm"
                onClick={() => popDrawerThread(props.document_uri)}
              >
                <GoBackTiny /> Back
              </button>
            </div>
          ) : bothAvailable ? (
            <ToggleGroup
              fullWidth
              value={activeTab}
              onChange={(value, e) => {
                e?.preventDefault();
                setInteractionState(props.document_uri, { drawer: value });
              }}
              options={[
                {
                  value: "comments",
                  label:
                    commentsCount > 0
                      ? `Comments (${commentsCount})`
                      : "Comments",
                },
                {
                  value: "quotes",
                  label: (
                    <div>
                      Bluesky <span className="hidden sm:inline">Mentions</span>{" "}
                      {filteredQuotesAndMentions.length > 0 &&
                        `(${filteredQuotesAndMentions.length})`}
                    </div>
                  ),
                },
              ]}
            />
          ) : (
            <h4>{activeTab === "quotes" ? "Bluesky Mentions" : "Comments"}</h4>
          )}
        </div>
        <button
          className="text-tertiary shrink-0"
          onClick={() =>
            setInteractionState(props.document_uri, { drawerOpen: false })
          }
        >
          <CloseTiny />
        </button>
      </div>
      <DrawerThreadContext.Provider value={drawerNav}>
        {sspUri ? (
          <StandardSitePostDrawerView uri={sspUri} tab={sspActiveTab} />
        ) : activeThread ? (
          <ThreadView
            parentUri={activeThread.uri}
            initialTab={activeThread.type === "quotes" ? "quotes" : "replies"}
          />
        ) : activeTab === "quotes" ? (
          <MentionsDrawerContent
            did={props.did}
            quotesAndMentions={filteredQuotesAndMentions}
          />
        ) : (
          props.commentsSlot
        )}
      </DrawerThreadContext.Provider>
    </>
  );
};
