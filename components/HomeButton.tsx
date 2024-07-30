import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";
import { HomeSmall } from "./Icons";
import { HoverButton } from "./Buttons";

export function HomeButton() {
  let entity_set = useEntitySetContext();
  if (!entity_set.permissions.write) return;
  return (
    <Link href="/home">
      <HoverButton
        noLabelOnMobile
        icon=<HomeSmall />
        label="Go Home"
        background="bg-accent-1"
        text="text-accent-2"
      />
    </Link>
  );
}
