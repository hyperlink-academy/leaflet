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
    <>
      <Media
        mobile={false}
        className="fixed r-0 top-0 shrink w-96 py-6 h-full max-w-full flex z-10"
      >
        <div
          id="interaction-drawer"
          className="opaque-container h-full w-full px-4 pt-3 pb-6 overflow-scroll "
        >
          <Quotes {...props} />
        </div>
      </Media>
      <Media
        mobile
        className="drawerMobileWrapper fixed bottom-0 left-0 right-0 h-[80vh] border-t border-border  bg-bg-page "
      >
        <div
          className="max-h-full px-3 pt-2 pb-6 overflow-auto"
          id="interaction-drawer-mobile"
        >
          <Quotes {...props} />
        </div>
      </Media>
    </>
  );
};
