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
              : "overflow-y-auto h-full border border-border-light rounded-lg! container px-3 sm:px-4 "
          }
          max-w-prose w-full
          flex flex-col
          text-center
    `}
    >
      {props.children}
    </div>
  );
}
