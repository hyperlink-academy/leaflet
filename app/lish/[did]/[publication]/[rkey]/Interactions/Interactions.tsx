"use client";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { create } from "zustand";

export let useInteractionState = create(() => ({ drawerOpen: false }));

export const Interactions = () => {
  let { drawerOpen } = useInteractionState();

  return (
    <div className="flex gap-2 text-sm text-tertiary ">
      {/* <div className="flex gap-1 items-center">
        <CommentTiny /> 5
      </div> */}
      <button
        className="flex gap-1 items-center"
        onClick={() =>
          useInteractionState.setState({ drawerOpen: !drawerOpen })
        }
      >
        <QuoteTiny /> 5
      </button>
    </div>
  );
};
