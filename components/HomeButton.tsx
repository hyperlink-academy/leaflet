import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";
import { BackToLeafletSmall, HomeSmall } from "./Icons";
import { HoverButton } from "./Buttons";
import { useState } from "react";

export function HomeButton() {
  let entity_set = useEntitySetContext();
  let [isSubpage, setIsSubpage] = useState(true);

  if (isSubpage === false && entity_set.permissions.write) {
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
  } else {
    return (
      <Link href="/">
        <HoverButton
          noLabelOnMobile
          icon={<BackToLeafletSmall />}
          label="See Full Leaflet"
          background="bg-accent-1"
          text="text-accent-2"
        />
      </Link>
    );
  }
}
