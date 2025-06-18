"use client";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { create } from "zustand";

export let useInteractionState = create(() => ({ drawerOpen: false }));

export const Interactions = (props: {
  compact?: boolean;
  className?: string;
}) => {
  let { drawerOpen } = useInteractionState();

  return (
    <div
      className={`flex gap-2 text-tertiary ${props.compact ? "text-sm" : ""} ${props.className}`}
    >
      {/* <div className="flex gap-1 items-center">
        <CommentTiny /> 5
      </div> */}
      <button
        className={`flex gap-1 items-center ${!props.compact && "px-1 py-0.5 border border-border-light rounded-lg trasparent-outline selected-outline"}`}
        onClick={() =>
          useInteractionState.setState({ drawerOpen: !drawerOpen })
        }
      >
        <QuoteTiny /> 5 {!props.compact && "Quotes"}
      </button>
    </div>
  );
};
