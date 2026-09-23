"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Tooltip } from "components/Tooltip";
import { useIsMobile } from "src/hooks/isMobile";
import styles from "./TutorialNavTooltip.module.css";

export type TutorialNavTarget =
  | "new-doc"
  | "publications"
  | "banner"
  | "sidebar-trigger";

// The tutorial lives in the page content area but points at the sidebar, which
// is rendered by a sibling shell — a store, rather than a prop, is what reaches
// across those two trees.
export const useTutorialNavTour = create<{
  active: boolean;
  setActive: (active: boolean) => void;
  blurred: boolean;
  setBlurred: (blurred: boolean) => void;
}>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
  blurred: false,
  setBlurred: (blurred) => set({ blurred }),
}));

export function useActivateTutorialNavTour() {
  let setActive = useTutorialNavTour((s) => s.setActive);
  useEffect(() => {
    setActive(true);
    return () => setActive(false);
  }, [setActive]);
}

export function useBlurTutorialNav(blurred: boolean) {
  let setBlurred = useTutorialNavTour((s) => s.setBlurred);
  useEffect(() => {
    setBlurred(blurred);
    return () => setBlurred(false);
  }, [blurred, setBlurred]);
}


const TOUR_COPY: {
  [key in TutorialNavTarget]: {
    title: string;
    description: string;
    showOn: "mobile" | "desktop";
    side: "top" | "right";
    align: "start" | "center" | "end";
  };
} = {
  "new-doc": {
    title: "Create documents",
    description: "Add them to publications, or use them as notes.",
    showOn: "desktop",
    side: "right",
    align: "end",
  },
  publications: {
    title: "Your publications",
    description:
      "Create and manage a blog, newsletter, comic, novel, zine, etc!",
    showOn: "desktop",
    side: "right",
    align: "start",
  },
  banner: {
    title: "Explore the Network",
    description: "Discover and subscribe to other writers on the Atmosphere!",
    showOn: "desktop",
    side: "right",
    align: "center",
  },
  "sidebar-trigger": {
    title: "Everything's in here!",
    description:
      "Tap to open the sidebar. You'll be able to make new docs, find your publications, and manage your settings",
    showOn: "mobile",
    side: "top",
    align: "start",
  },
};

const ENTER_ORDER: TutorialNavTarget[] = ["new-doc", "publications", "banner"];
const DELAY_CLASSES = [styles.delay0, styles.delay1, styles.delay2];

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

  let delayIndex = Math.max(ENTER_ORDER.indexOf(props.target), 0);

  return (
    <Tooltip
      asChild
      open
      side={side}
      align={align}
      className={`${styles.tooltip} ${DELAY_CLASSES[delayIndex]} w-56 text-center`}
      trigger={anchor}
    >
      <div className="font-bold">{title}</div>
      <div className="text-secondary text-sm leading-snug">{description}</div>
    </Tooltip>
  );
}
