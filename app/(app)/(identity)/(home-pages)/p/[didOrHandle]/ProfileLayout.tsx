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
              : "overflow-y-auto h-full border border-border-light rounded-lg! container px-4 sm:px-6 sm:py-2 "
          }
          max-w-md w-full
          flex flex-col
          text-center
    `}
    >
      {props.children}
    </div>
  );
}
