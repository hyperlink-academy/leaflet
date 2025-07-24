"use client";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { flushSync } from "react-dom";
import { Json } from "supabase/database.types";
import { create } from "zustand";

export let useInteractionState = create(() => ({ drawerOpen: false }));
export function openInteractionDrawer() {
  flushSync(() => {
    useInteractionState.setState({ drawerOpen: true });
  });
  let el = document.getElementById("interaction-drawer");
  let isIntersecting = false;
  if (el) {
    const rect = el.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;
    isIntersecting =
      rect.top < windowHeight &&
      rect.bottom > 0 &&
      rect.left < windowWidth &&
      rect.right > 0;
  }

  if (el && !isIntersecting) el.scrollIntoView({ behavior: "smooth" });
}

export const Interactions = (props: {
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
  compact?: boolean;
  className?: string;
}) => {
  let { drawerOpen } = useInteractionState();

  return (
    <div
      className={`flex gap-2 text-tertiary ${props.compact ? "text-sm" : ""} ${props.className}`}
    >
      <button
        className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
        onClick={() => {
          if (!drawerOpen) openInteractionDrawer();
          else useInteractionState.setState({ drawerOpen: false });
        }}
      >
        <QuoteTiny /> {props.quotes.length} {!props.compact && "Quotes"}
      </button>
    </div>
  );
};

function getFirstScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const computedStyle = window.getComputedStyle(parent);
    const overflowY = computedStyle.overflowY;
    const overflowX = computedStyle.overflowX;

    if (
      overflowY === "scroll" ||
      overflowY === "auto" ||
      overflowX === "scroll" ||
      overflowX === "auto"
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}
