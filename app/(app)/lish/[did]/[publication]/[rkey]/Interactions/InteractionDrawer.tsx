"use client";
import { MentionsDrawerContent } from "./Quotes";
import {
  InteractionState,
  setInteractionState,
  useInteractionState,
} from "./Interactions";
import { useSearchParams } from "next/navigation";
import { SandwichSpacer } from "components/LeafletLayout";
import { decodeQuotePosition } from "../quotePosition";
import { CloseTiny } from "components/Icons/CloseTiny";
import { ToggleGroup } from "components/ToggleGroup";

export const InteractionDrawer = (props: {
  showPageBackground: boolean | undefined;
  document_uri: string;
  quotesAndMentions: { uri: string; link?: string }[];
  commentsSlot: React.ReactNode;
  did: string;
  pageId?: string;
}) => {
  let drawer = useDrawerOpen(props.document_uri);
  if (!drawer) return null;

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
      <SandwichSpacer noWidth />
      <div className="snap-center h-full  flex z-10 shrink-0 sm:max-w-prose sm:w-full w-[calc(100vw-12px)]">
        <div
          id="interaction-drawer"
          className={`opaque-container relative h-full w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-6  overflow-scroll flex flex-col  ${props.showPageBackground ? "rounded-l-none! rounded-r-lg! -ml-[1px]" : "rounded-lg! sm:ml-4"}`}
        >
          <div className="w-full flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              {bothAvailable ? (
                <ToggleGroup
                  fullWidth
                  value={activeTab}
                  onChange={(value) =>
                    setInteractionState(props.document_uri, { drawer: value })
                  }
                  options={[
                    { value: "comments", label: "Comments" },
                    { value: "quotes", label: "Bluesky Mentions" },
                  ]}
                />
              ) : (
                <h4>
                  {activeTab === "quotes" ? "Bluesky Mentions" : "Comments"}
                </h4>
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
          {activeTab === "quotes" ? (
            <MentionsDrawerContent
              did={props.did}
              quotesAndMentions={filteredQuotesAndMentions}
            />
          ) : (
            props.commentsSlot
          )}
        </div>
      </div>
    </>
  );
};

export const useDrawerOpen = (uri: string) => {
  let params = useSearchParams();
  let interactionDrawerSearchParam = params.get("interactionDrawer");
  let pageParam = params.get("page");
  let { drawerOpen: open, drawer, pageId } = useInteractionState(uri);
  if (open === false || (open === undefined && !interactionDrawerSearchParam))
    return null;
  drawer =
    drawer || (interactionDrawerSearchParam as InteractionState["drawer"]);
  // Use pageId from state, or fall back to page search param
  const resolvedPageId = pageId ?? pageParam ?? undefined;
  return { drawer, pageId: resolvedPageId };
};
