"use client";

import { BlobRef } from "@atproto/lexicon";
import { Header } from "components/PageHeader";

export const DashboardHeader = (props: {
  icon: BlobRef | null;
  name: string;
  did: string;
}) => {
  return (
    <div className="font-bold text-secondary flex gap-2 items-center">
      {props.icon && (
        <div
          className="pubDashLogo shrink-0 w-6 h-6 rounded-full  border-2 border-bg-page "
          style={{
            backgroundImage: `url(/api/atproto_images?did=${props.did}&cid=${(props.icon.ref as unknown as { $link: string })["$link"]})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      )}
      {props.name}
    </div>
  );
};
