"use client";

import { useSmoker } from "components/Toast";
import { fixFeeds } from "./fixFeeds";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useState } from "react";

export function FixFeedsButton() {
  let smoker = useSmoker();
  let [loading, setLoading] = useState(false);
  return (
    <ButtonPrimary
      onClick={async (e) => {
        let rect = e.currentTarget?.getBoundingClientRect();
        setLoading(true);
        await fixFeeds();
        setLoading(false);
        smoker({
          position: {
            x: rect.left + (rect.right - rect.left) / 2,
            y: rect.top - 16,
          },
          text: "Fixed your feeds!",
        });
      }}
    >
      {loading ? <DotLoader /> : "Fix My Feeds"}
    </ButtonPrimary>
  );
}
