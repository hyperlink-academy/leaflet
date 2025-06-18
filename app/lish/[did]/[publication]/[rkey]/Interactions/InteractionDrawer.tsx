"use client";
import { Media } from "components/Media";
import { Quotes } from "./Quotes";
import { useInteractionState } from "./Interactions";

export const InteractionDrawer = () => {
  let { drawerOpen: open } = useInteractionState();

  if (!open) return null;
  return (
    <>
      <Media
        mobile={false}
        className="sticky top-0 shrink w-96 py-6 h-full max-w-full flex"
      >
        <div className="opaque-container h-full w-full px-4 pt-3 pb-6 overflow-scroll ">
          <Quotes />
        </div>
      </Media>
      <Media
        mobile
        className="drawerMobileWrapper fixed bottom-0 left-0 right-0 h-[80vh] border-t border-border px-3 pt-2 pb-6  bg-bg-page overflow-auto"
      >
        <Quotes />
      </Media>
    </>
  );
};
