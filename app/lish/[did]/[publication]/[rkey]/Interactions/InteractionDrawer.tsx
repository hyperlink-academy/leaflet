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
      <Media mobile={false} className="absolute left-full top-0">
        <div className="fixed top-0 pl-2 shrink w-96 py-6 h-[95vh] max-w-full flex z-10">
          <div
            id="interaction-drawer"
            className="opaque-container h-full w-full px-4 pt-3 pb-6 overflow-scroll "
          >
            <Quotes {...props} />
          </div>
        </div>
      </Media>
      <Media mobile>
        <div className="drawerMobileWrapper fixed bottom-0 left-0 right-0 h-[80vh] border-t border-border  bg-bg-page z-10">
          <div
            className="max-h-full px-3 pt-2 pb-6 overflow-auto"
            id="interaction-drawer-mobile"
          >
            <Quotes {...props} />
          </div>
        </div>
        <div
          className="fixed w-screen h-screen bottom-0 left-0"
          onClick={() => {
            useInteractionState.setState({ drawerOpen: false });
          }}
        />
      </Media>
    </>
  );
};
