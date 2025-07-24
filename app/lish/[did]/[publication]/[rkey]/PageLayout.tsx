"use client";

import { useInteractionState } from "./Interactions/Interactions";

export function PageLayout(props: { children: React.ReactNode }) {
  let { drawerOpen } = useInteractionState();
  return (
    <div
      onScroll={(e) => {}}
      className="post w-full relative overflow-x-scroll snap-x snap-mandatory no-scrollbar grow items-stretch flex h-full pwa-padding mx-auto"
      id="page-carousel"
    >
      {/* if you adjust this padding, remember to adjust the negative margins on page in Pages/index when card borders are hidden (also applies for the pb in the parent div)*/}
      <div id="pages" className="postWrapper flex h-full gap-6  w-full">
        {props.children}
      </div>
    </div>
  );
}
