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
  document_uri: string;
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
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

  const filteredQuotes = props.pageId
    ? props.quotes.filter((q) => q.link.includes(props.pageId!))
    : props.quotes.filter((q) => {
        const url = new URL(q.link);
        const quoteParam = url.pathname.split("/l-quote/")[1];
        if (!quoteParam) return null;
        const quotePosition = decodeQuotePosition(quoteParam);
        return !quotePosition?.pageId;
      });

  return (
    <>
      <SandwichSpacer noWidth />
      <div className="snap-center h-full  flex z-10 shrink-0  w-[calc(var(--page-width-units)-6px)] sm:w-[calc(var(--page-width-units))]">
        <div
          id="interaction-drawer"
          className="opaque-container rounded-l-none! rounded-r-lg! h-full w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-6  overflow-scroll -ml-[1px] "
        >
          {drawer.drawer === "quotes" ? (
            <Quotes {...props} quotes={filteredQuotes} />
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
  let { drawerOpen: open, drawer, pageId } = useInteractionState(uri);
  if (open === false || (open === undefined && !interactionDrawerSearchParam))
    return null;
  drawer =
    drawer || (interactionDrawerSearchParam as InteractionState["drawer"]);
  return { drawer, pageId };
};
