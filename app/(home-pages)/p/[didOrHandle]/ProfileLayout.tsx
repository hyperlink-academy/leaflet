"use client";

import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

export function ProfileLayout(props: { children: React.ReactNode }) {
  let borderHidden = useCardBorderHidden();
  return (
    <div className="h-full">
      <div
        id="profile-content"
        className={`
          ${
            borderHidden
              ? ""
              : "h-full border border-border-light rounded-lg overflow-y-scroll"
          }
          max-w-prose
          mx-auto
    w-full
    flex flex-col
    text-center
    `}
      >
        {props.children}
      </div>
    </div>
  );
}
