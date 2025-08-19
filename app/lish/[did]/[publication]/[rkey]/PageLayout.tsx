"use client";

import { useInteractionState } from "./Interactions/Interactions";

export function PageLayout(props: { children: React.ReactNode }) {
  let { drawerOpen } = useInteractionState();
  return (
    <div
      onScroll={(e) => {}}
      className="post w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full pwa-padding mx-auto "
      id="page-carousel"
    >
      {/* if you adjust this padding, remember to adjust the negative margins on page
        in [rkey]/page/PostPage when card borders are hidden */}
      <div
        id="pages"
        className="postWrapper flex h-full gap-0 sm:gap-3 py-2 sm:py-6 w-full"
      >
        {props.children}
      </div>
    </div>
  );
}
