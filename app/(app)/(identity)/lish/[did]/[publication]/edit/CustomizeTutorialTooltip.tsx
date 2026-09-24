"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Tooltip } from "components/Tooltip";
import styles from "app/(app)/(identity)/(home-pages)/(writer)/home/Tutorial/TutorialNavTooltip.module.css";

export type CustomizeTutorialTarget =
  | "theme"
  | "new-page"
  | "content"
  | "posts-list";

// The targets are spread across the header, the nav, and blocks rendered deep
// inside the page editor — a store reaches them without threading a prop
// through every block.
export const useCustomizeTutorial = create<{
  active: boolean;
  setActive: (active: boolean) => void;
}>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));

// Tooltips cover part of the editor, so they clear on the first click and let
// the user get on with customizing.
export function useActivateCustomizeTutorial(enabled: boolean) {
  let setActive = useCustomizeTutorial((s) => s.setActive);
  useEffect(() => {
    if (!enabled) return;
    setActive(true);
    let dismiss = () => setActive(false);
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      setActive(false);
    };
  }, [enabled, setActive]);
}

// TEMP: forces the tooltips on for testing. Remove before shipping.
const FORCE_TUTORIAL = true;

const TOUR_COPY: {
  [key in CustomizeTutorialTarget]: {
    title: string;
    description: string;
    side: "top" | "right" | "bottom" | "left";
    align: "start" | "center" | "end";
  };
} = {
  theme: {
    title: "Set your theme",
    description: "Pick colors, fonts, and a background for your publication.",
    side: "bottom",
    align: "end",
  },
  "new-page": {
    title: "Add pages",
    description: "Make an about page, or link out to anywhere else.",
    side: "right",
    align: "center",
  },
  content: {
    title: "Edit your home page",
    description: "Write anything here, just like in a doc!",
    side: "bottom",
    align: "start",
  },
  "posts-list": {
    title: "Your posts",
    description: "Posts you publish will show up here. Move it anywhere!",
    side: "top",
    align: "end",
  },
};

const ENTER_ORDER: CustomizeTutorialTarget[] = [
  "theme",
  "new-page",
  "content",
  "posts-list",
];
const DELAY_CLASSES = [
  styles.delay0,
  styles.delay1,
  styles.delay2,
  styles.delay3,
];

export function CustomizeTutorialTooltip(props: {
  target: CustomizeTutorialTarget;
  className?: string;
  children: React.ReactNode;
}) {
  let active = useCustomizeTutorial((s) => s.active);
  let { title, description, side, align } = TOUR_COPY[props.target];

  let anchor = <div className={props.className}>{props.children}</div>;
  if (!active && !FORCE_TUTORIAL) return anchor;

  return (
    <Tooltip
      asChild
      open
      side={side}
      align={align}
      className={`${styles.tooltip} ${DELAY_CLASSES[ENTER_ORDER.indexOf(props.target)]} w-56 text-center`}
      trigger={anchor}
    >
      <div className="font-bold">{title}</div>
      <div className="text-secondary text-sm leading-snug">{description}</div>
    </Tooltip>
  );
}
