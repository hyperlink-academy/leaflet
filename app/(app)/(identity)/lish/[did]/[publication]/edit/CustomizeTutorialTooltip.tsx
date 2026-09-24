"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { Tooltip } from "components/Tooltip";
import { NestedCardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useUIState } from "src/useUIState";
import { useIsMobile } from "src/hooks/isMobile";
import styles from "app/(app)/(identity)/(home-pages)/(writer)/home/Tutorial/TutorialNavTooltip.module.css";

export type CustomizeTutorialTarget =
  | "theme"
  | "new-page"
  | "content"
  | "text"
  | "posts-list";

// The targets are spread across the header, the nav, and blocks rendered deep
// inside the page editor — a store reaches them without threading a prop
// through every block.
export const useCustomizeTutorial = create<{
  active: boolean;
  contentFocused: boolean;
  dismissed: CustomizeTutorialTarget[];
  setActive: (active: boolean) => void;
  setContentFocused: (focused: boolean) => void;
  dismiss: (target: CustomizeTutorialTarget) => void;
}>((set) => ({
  active: false,
  contentFocused: false,
  dismissed: [],
  setActive: (active) => set({ active }),
  setContentFocused: (focused) =>
    set((s) => ({
      contentFocused: focused,
      // Once the user has found the content area, the hint pointing them to it
      // is done.
      dismissed:
        focused && !s.dismissed.includes("content")
          ? [...s.dismissed, "content"]
          : s.dismissed,
    })),
  dismiss: (target) =>
    set((s) =>
      s.dismissed.includes(target)
        ? s
        : { dismissed: [...s.dismissed, target] },
    ),
}));

// TEMP: forces the tooltips on for testing. Remove before shipping.
const FORCE_TUTORIAL = true;

export function useActivateCustomizeTutorial(enabled: boolean) {
  let setActive = useCustomizeTutorial((s) => s.setActive);
  let setContentFocused = useCustomizeTutorial((s) => s.setContentFocused);
  let on = enabled || FORCE_TUTORIAL;
  useEffect(() => {
    if (!on) return;
    setActive(true);
    let onFocus = (
      s: ReturnType<typeof useUIState.getState>,
      prev?: ReturnType<typeof useUIState.getState>,
    ) => {
      if (prev && s.focusedEntity === prev.focusedEntity) return;
      setContentFocused(s.focusedEntity?.entityType === "block");
    };
    onFocus(useUIState.getState());
    let unsubscribe = useUIState.subscribe(onFocus);
    // Clicking the header or nav leaves the last block focused in UI state, so
    // clicks decide it too. Clicks outside the editor chrome (portaled menus,
    // the toolbar) are part of editing and leave it alone.
    let onPointerDown = (e: PointerEvent) => {
      let target = e.target as Element;
      if (target.closest(".pubWrapper .blocks")) setContentFocused(true);
      else if (target.closest(".pubWrapper, .publicationEditHeader"))
        setContentFocused(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", onPointerDown, true);
      setActive(false);
    };
  }, [on, setActive, setContentFocused]);
}

type TooltipPlacement = {
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
  xOffset?: number;
  yOffset?: number;
};

const TOUR_COPY: {
  [key in CustomizeTutorialTarget]: TooltipPlacement & {
    title: string;
    description?: string;
    mobile?: Partial<TooltipPlacement> & { description?: string };
    fixed?: boolean;
  };
} = {
  theme: {
    title: "Set a theme",
    description: "Colors, font, background!",
    side: "bottom",
    align: "center",
  },
  "new-page": {
    title: "Add pages",
    description: "Like an about page, annoucements, or subsets of posts.",
    side: "right",
    align: "center",
    mobile: { side: "top", align: "center", xOffset: 0, yOffset: 4 },
  },
  content: {
    title: "Edit your content",
    description: `Click to write something! Type "/" in an empty line to add images, embeds, post lists and more`,
    side: "right",
    align: "center",
    yOffset: 48,
    fixed: true,
    mobile: {
      description: `Tap the content area to write something! Type "/" in an empty line to add images, embeds, post lists and more.`,
    },
  },
  text: {
    title: "Add content blocks",
    description: `Click the +, or type "/" to add images, post lists, reccs, and more.`,
    side: "right",
    align: "center",
  },
  "posts-list": {
    title: "Your posts",
    description:
      "Your published posts show up here. Change how it looks with the gear icon",
    side: "right",
    align: "center",
    mobile: { side: "top", align: "end", yOffset: 0 },
  },
};

const ENTER_ORDER: CustomizeTutorialTarget[] = ["theme", "new-page", "content"];
const DELAY_CLASSES = [styles.delay0, styles.delay1, styles.delay2];

const BLOCK_TARGETS: CustomizeTutorialTarget[] = ["text", "posts-list"];

export function useTutorialOpen(
  target: CustomizeTutorialTarget,
  blockFocused = false,
) {
  return useCustomizeTutorial(
    (s) =>
      s.active &&
      !s.dismissed.includes(target) &&
      (BLOCK_TARGETS.includes(target)
        ? blockFocused && s.contentFocused
        : !s.contentFocused),
  );
}

function TutorialTooltipContent(props: { target: CustomizeTutorialTarget }) {
  let isMobile = useIsMobile();
  let { title, description, mobile } = TOUR_COPY[props.target];
  let dismiss = useCustomizeTutorial((s) => s.dismiss);
  // The content is portaled, but React still bubbles its events up to the
  // blocks the tooltip lives in, which would focus or select them.
  let stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold">{title}</div>
        <button
          type="button"
          aria-label="Close"
          className="shrink-0 mt-1 text-tertiary hover:text-primary"
          onPointerDown={stop}
          onMouseDown={(e) => {
            e.stopPropagation();
            // Keeps focus in the editor the user was typing in.
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            dismiss(props.target);
          }}
        >
          <CloseTiny className="w-3 h-3" />
        </button>
      </div>
      <div className="text-secondary text-sm leading-snug">
        {(isMobile && mobile?.description) || description}
      </div>
    </>
  );
}

function FixedBottomTooltip(props: {
  target: CustomizeTutorialTarget;
  open: boolean;
}) {
  if (!props.open) return null;
  let delay = DELAY_CLASSES[ENTER_ORDER.indexOf(props.target)] ?? styles.delay0;
  let stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return createPortal(
    <NestedCardThemeProvider>
      <div
        role="tooltip"
        className={`${styles.tooltip} ${delay} portalStyles light-container fixed z-20 bottom-4 sm:bottom-8 inset-x-4 mx-auto max-w-sm px-3 py-2 bg-bg-page border border-border rounded-md shadow-md text-left`}
        onPointerDown={stop}
        onMouseDown={stop}
        onClick={stop}
      >
        <TutorialTooltipContent target={props.target} />
      </div>
    </NestedCardThemeProvider>,
    document.body,
  );
}

function TutorialTooltip(props: {
  target: CustomizeTutorialTarget;
  open: boolean;
  trigger: React.ReactNode;
}) {
  let isMobile = useIsMobile();
  let { mobile, fixed, title, description, ...desktop } =
    TOUR_COPY[props.target];
  if (fixed)
    return (
      <>
        {props.trigger}
        <FixedBottomTooltip target={props.target} open={props.open} />
      </>
    );
  let { side, align, xOffset, yOffset } = isMobile
    ? { ...desktop, ...mobile }
    : desktop;
  let delay = DELAY_CLASSES[ENTER_ORDER.indexOf(props.target)] ?? styles.delay0;

  return (
    <Tooltip
      asChild
      open={props.open}
      side={side}
      align={align}
      className={`${styles.tooltip} ${delay} w-fit max-w-56! text-left`}
      style={{ translate: `${xOffset ?? 0}px ${yOffset ?? 0}px` }}
      trigger={props.trigger}
    >
      <TutorialTooltipContent target={props.target} />
    </Tooltip>
  );
}

export function CustomizeTutorialTooltip(props: {
  target: CustomizeTutorialTarget;
  className?: string;
  blockFocused?: boolean;
  children: React.ReactNode;
}) {
  let active = useCustomizeTutorial((s) => s.active);
  let open = useTutorialOpen(props.target, props.blockFocused);
  let dismiss = useCustomizeTutorial((s) => s.dismiss);

  let anchor = (
    <div
      className={props.className}
      // Chrome tooltips hide while the content is focused, so clicking their
      // anchor still counts. Block tooltips only count once they've appeared.
      onPointerDown={
        open || !BLOCK_TARGETS.includes(props.target)
          ? () => dismiss(props.target)
          : undefined
      }
    >
      {props.children}
    </div>
  );
  if (!active) return anchor;

  // Stays wrapped after dismissal: unwrapping on pointerdown would remount the
  // anchor mid-click, and the click it was meant to trigger would never land.
  return <TutorialTooltip target={props.target} open={open} trigger={anchor} />;
}
