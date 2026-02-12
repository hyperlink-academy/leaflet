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
              ? ""
              : "overflow-y-scroll h-full border border-border-light rounded-lg  bg-bg-page px-3 sm:px-4"
          }
          max-w-prose mx-auto w-full
          flex flex-col pb-3
          text-center
    `}
    >
      {props.children}
    </div>
  );
}
