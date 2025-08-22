"use client";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { flushSync } from "react-dom";
import type { Json } from "supabase/database.types";
import { create } from "zustand";
import type { Comment } from "./Comments";

export let useInteractionState = create(() => ({
  drawerOpen: false,
  drawer: undefined as undefined | "comments" | "quotes",
  localComments: [] as Comment[],
}));
export function openInteractionDrawer(drawer: "comments" | "quotes") {
  flushSync(() => {
    useInteractionState.setState({ drawerOpen: true, drawer });
  });
  let el = document.getElementById("interaction-drawer");
  let isOffscreen = false;
  if (el) {
    const rect = el.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;
    isOffscreen = rect.right > windowWidth;
  }

  if (el && isOffscreen) el.scrollIntoView({ behavior: "smooth" });
}

export const Interactions = (props: {
  quotesCount: number;
  commentsCount: number;
  compact?: boolean;
  className?: string;
}) => {
  let { drawerOpen, drawer } = useInteractionState();

  return (
    <div
      className={`flex gap-2 text-tertiary ${props.compact ? "text-sm" : ""} ${props.className}`}
    >
      <button
        className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
        onClick={() => {
          if (!drawerOpen || drawer !== "quotes")
            openInteractionDrawer("quotes");
          else useInteractionState.setState({ drawerOpen: false });
        }}
      >
        <QuoteTiny /> {props.quotesCount}{" "}
        {!props.compact && `Quote${props.quotesCount === 1 ? "" : "s"}`}
      </button>
      <button
        className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
        onClick={() => {
          if (!drawerOpen || drawer !== "comments")
            openInteractionDrawer("comments");
          else useInteractionState.setState({ drawerOpen: false });
        }}
      >
        <CommentTiny /> {props.commentsCount}{" "}
        {!props.compact && `Comment${props.commentsCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
};
