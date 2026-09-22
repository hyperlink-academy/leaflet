"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Tooltip, TOOLTIP_SIDE_OFFSET } from "components/Tooltip";
import { useIsMobile } from "src/hooks/isMobile";

export type TutorialNavTarget =
  | "new-doc"
  | "publications"
  | "banner"
  | "account"
  | "sidebar-trigger";

// The tutorial lives in the page content area but points at the sidebar, which
// is rendered by a sibling shell — a store, rather than a prop, is what reaches
// across those two trees.
export const useTutorialNavTour = create<{
  active: boolean;
  setActive: (active: boolean) => void;
}>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));

export function useActivateTutorialNavTour() {
  let setActive = useTutorialNavTour((s) => s.setActive);
  useEffect(() => {
    setActive(true);
    return () => setActive(false);
  }, [setActive]);
}

// On mobile the sidebar is behind the footer's menu button, so the tour there
// is the single tooltip pointing at that button; the pieces it opens up get
// their own tooltips only on desktop, where they're always on screen.
const TOUR_COPY: {
  [key in TutorialNavTarget]: {
    title: string;
    description: string;
    showOn: "mobile" | "desktop";
    side: "top" | "right";
    align: "start" | "center";
    xOffset?: number;
    yOffset?: number;
  };
} = {
  "new-doc": {
    title: "Start something new",
    description: "Write a doc, or open a canvas to arrange things spatially.",
    showOn: "desktop",
    side: "right",
    align: "center",
  },
  publications: {
    title: "Your publications",
    description:
      "A blog, newsletter, or zine of your own — every publication you make or help write lives here.",
    showOn: "desktop",
    side: "right",
    align: "start",
    yOffset: 30,
  },
  banner: {
    title: "Read along",
    description:
      "Follow other writers on the Atmosphere and their posts land in your reader.",
    showOn: "desktop",
    side: "right",
    align: "center",
  },
  account: {
    title: "You, and your settings",
    description:
      "Your profile, subscriptions, and account settings are all in here.",
    showOn: "desktop",
    side: "right",
    align: "center",
    xOffset: 24,
  },
  "sidebar-trigger": {
    title: "Everything's in here",
    description:
      "Tap to open your sidebar — new docs, your publications, and your account settings.",
    showOn: "mobile",
    side: "top",
    align: "start",
  },
};

// Radix offsets a tooltip along its own side and align axes, so which screen
// axis each one moves flips with the side: on a right-side tooltip the side
// axis is x and align is y, on a top-side one the side axis is y pointing up.
function tourOffsets(target: TutorialNavTarget) {
  let { side, xOffset = 0, yOffset = 0 } = TOUR_COPY[target];
  return side === "right"
    ? {
        sideOffset: TOOLTIP_SIDE_OFFSET + xOffset,
        alignOffset: yOffset,
      }
    : {
        sideOffset: TOOLTIP_SIDE_OFFSET - yOffset,
        alignOffset: xOffset,
      };
}

// Wraps a piece of the navigation in a tooltip that's pinned open for the
// duration of the tutorial's navigation step. Always renders the wrapping div,
// tour or not, so turning the tour on doesn't shift the layout around.
export function TutorialNavTooltip(props: {
  target: TutorialNavTarget;
  className?: string;
  children: React.ReactNode;
}) {
  let active = useTutorialNavTour((s) => s.active);
  let isMobile = useIsMobile();
  let { title, description, showOn, side, align } = TOUR_COPY[props.target];

  let anchor = <div className={props.className}>{props.children}</div>;
  if (!active || (showOn === "mobile") !== isMobile) return anchor;

  return (
    <Tooltip
      asChild
      open
      side={side}
      align={align}
      {...tourOffsets(props.target)}
      className="w-56 text-center"
      trigger={anchor}
    >
      <div className="font-bold">{title}</div>
      <div className="text-secondary text-sm leading-snug">{description}</div>
    </Tooltip>
  );
}
