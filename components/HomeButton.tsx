import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";
import { BackToLeafletSmall, HomeSmall } from "./Icons";
import { HoverButton } from "./Buttons";
import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export function HomeButton() {
  let { permissions } = useEntitySetContext();
  let searchParams = useSearchParams();
  let params = useParams();
  let isSubpage = !!searchParams.get("page");

  if (isSubpage)
    return (
      <Link href={`/${params.leaflet_id}`}>
        <HoverButton
          noLabelOnMobile
          icon={<BackToLeafletSmall />}
          label="See Full Leaflet"
          background="bg-accent-1"
          text="text-accent-2"
        />
      </Link>
    );
  if (!permissions.write) return null;
  return (
    <Link href="/home">
      <HoverButton
        noLabelOnMobile
        icon={<HomeSmall />}
        label="Go Home"
        background="bg-accent-1"
        text="text-accent-2"
      />
    </Link>
  );
}
