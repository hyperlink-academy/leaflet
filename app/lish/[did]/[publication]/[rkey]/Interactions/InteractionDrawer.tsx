"use client";
import { Media } from "components/Media";
import { Quotes } from "./Quotes";
import { useInteractionState } from "./Interactions";
import { Json } from "supabase/database.types";
import { Comment, Comments } from "./Comments";
import { useSearchParams } from "next/navigation";

export const InteractionDrawer = (props: {
  document_uri: string;
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
  comments: Comment[];
  did: string;
}) => {
  let params = useSearchParams();
  let interactionDrawerSearchParam = params.get("interactionDrawer");
  let { drawerOpen: open, drawer } = useInteractionState();
  if (open === false || (open === undefined && !interactionDrawerSearchParam))
    return null;
  let currentDrawer = drawer || interactionDrawerSearchParam;
  return (
    <>
      <div className="sm:pr-4 pr-[6px] snap-center">
        <div className="shrink-0  w-[calc(var(--page-width-units)-12px)] sm:w-[var(--page-width-units)] h-full  flex z-10">
          <div
            id="interaction-drawer"
            className="opaque-container !rounded-lg h-full w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-6 overflow-scroll "
          >
            {currentDrawer === "quotes" ? (
              <Quotes {...props} />
            ) : (
              <Comments
                document_uri={props.document_uri}
                comments={props.comments}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
