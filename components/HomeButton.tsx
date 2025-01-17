import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";
import { HomeSmall } from "./Icons";
import { HoverButton } from "./Buttons";
import { useParams, useSearchParams } from "next/navigation";

export function HomeButton() {
  let { permissions } = useEntitySetContext();
  let searchParams = useSearchParams();

  if (permissions.write)
    return (
      <Link href="/home" prefetch>
        <HoverButton
          noLabelOnMobile
          icon={<HomeSmall />}
          label="Go Home"
          background="bg-accent-1"
          text="text-accent-2"
        />
      </Link>
    );
  return null;
}
