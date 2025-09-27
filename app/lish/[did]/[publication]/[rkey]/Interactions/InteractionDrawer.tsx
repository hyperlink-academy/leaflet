"use client";
import { Media } from "components/Media";
import { Quotes } from "./Quotes";
import { useInteractionState } from "./Interactions";
import { Json } from "supabase/database.types";
import { Comment, Comments } from "./Comments";
import { useSearchParams } from "next/navigation";
import { SandwichSpacer } from "components/LeafletLayout";

export const InteractionDrawer = (props: {
  document_uri: string;
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
  comments: Comment[];
  did: string;
}) => {
  let drawer = useDrawerOpen();
  if (!drawer) return null;
  return (
    <>
      <div className="snap-center h-full  flex z-10 shrink-0  w-[calc(var(--page-width-units)-12px)] sm:w-[var(--page-width-units)]">
        <div
          id="interaction-drawer"
          className="opaque-container !rounded-lg h-full w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-6 overflow-scroll "
        >
          {drawer === "quotes" ? (
            <Quotes {...props} />
          ) : (
            <Comments
              document_uri={props.document_uri}
              comments={props.comments}
            />
          )}
        </div>
      </div>
    </>
  );
};

export const useDrawerOpen = () => {
  let params = useSearchParams();
  let interactionDrawerSearchParam = params.get("interactionDrawer");
  let { drawerOpen: open, drawer } = useInteractionState();
  if (open === false || (open === undefined && !interactionDrawerSearchParam))
    return null;
  return drawer || interactionDrawerSearchParam;
};
