"use client";
import { Media } from "components/Media";
import { Quotes } from "./Quotes";
import { InteractionState, useInteractionState } from "./Interactions";
import { Json } from "supabase/database.types";
import { Comment, Comments } from "./Comments";
import { useSearchParams } from "next/navigation";
import { SandwichSpacer } from "components/LeafletLayout";
import { decodeQuotePosition } from "../quotePosition";

export const InteractionDrawer = (props: {
  showPageBackground: boolean | undefined;
  document_uri: string;
  quotesAndMentions: { uri: string; link?: string }[];
  comments: Comment[];
  did: string;
  pageId?: string;
}) => {
  let drawer = useDrawerOpen(props.document_uri);
  if (!drawer) return null;

  // Filter comments and quotes based on pageId
  const filteredComments = props.comments.filter(
    (c) => (c.record as any)?.onPage === props.pageId,
  );

  const filteredQuotesAndMentions = props.quotesAndMentions.filter((q) => {
    if (!q.link) return !props.pageId; // Direct mentions without quote context go to main page
    const url = new URL(q.link);
    const quoteParam = url.pathname.split("/l-quote/")[1];
    if (!quoteParam) return !props.pageId;
    const quotePosition = decodeQuotePosition(quoteParam);
    return quotePosition?.pageId === props.pageId;
  });

  return (
    <>
      <SandwichSpacer noWidth />
      <div className="snap-center h-full  flex z-10 shrink-0  w-[calc(var(--page-width-units)-6px)] sm:w-[calc(var(--page-width-units))]">
        <div
          id="interaction-drawer"
          className={`opaque-container  h-full w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-6  overflow-scroll -ml-[1px] ${props.showPageBackground ? "rounded-l-none! rounded-r-lg!" : "rounded-lg! sm:mx-2"}`}
        >
          {drawer.drawer === "quotes" ? (
            <Quotes {...props} quotesAndMentions={filteredQuotesAndMentions} />
          ) : (
            <Comments
              document_uri={props.document_uri}
              comments={filteredComments}
              pageId={props.pageId}
            />
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
