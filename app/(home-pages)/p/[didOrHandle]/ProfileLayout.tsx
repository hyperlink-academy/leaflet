"use client";

import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

export function ProfileLayout(props: { children: React.ReactNode }) {
  let cardBorderHidden = useCardBorderHidden();
  return (
    <div
      id="profile-content"
      className={`
          ${
            cardBorderHidden
              ? "bg-transparent"
              : "overflow-y-scroll h-full border border-border-light rounded-lg! container px-3 sm:px-4 sm:-mt-2"
          }
          max-w-prose w-full
          flex flex-col pb-3
          text-center
    `}
    >
      {props.children}
    </div>
  );
}
