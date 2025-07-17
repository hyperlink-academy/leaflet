"use client";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Json } from "supabase/database.types";
import { create } from "zustand";

export let useInteractionState = create(() => ({ drawerOpen: false }));

export const Interactions = (props: {
  quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
  compact?: boolean;
  className?: string;
}) => {
  let { drawerOpen } = useInteractionState();

  if (props.quotes.length === 0) return null;
  return (
    <div
      className={`flex gap-2 text-tertiary ${props.compact ? "text-sm" : ""} ${props.className}`}
    >
      <button
        className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
        onClick={() =>
          useInteractionState.setState({ drawerOpen: !drawerOpen })
        }
      >
        <QuoteTiny /> {props.quotes.length} {!props.compact && "Quotes"}
      </button>
    </div>
  );
};
