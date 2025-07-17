"use client";
import { Media } from "components/Media";
import { Quotes } from "./Quotes";
import { useInteractionState } from "./Interactions";
import { Json } from "supabase/database.types";

export const InteractionDrawer = (props: {
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
  did: string;
}) => {
  let { drawerOpen: open } = useInteractionState();
  if (!open) return null;
  return (
    <div className="sm:pr-4 pr-[6px]">
      <div className="shrink-0 w-96 max-w-[var(--page-width-units)] h-full  flex z-10 ">
        <div
          id="interaction-drawer"
          className="opaque-container h-full w-full px-4 pt-3 pb-6 overflow-scroll "
        >
          <Quotes {...props} />
        </div>
      </div>
    </div>
  );
};
