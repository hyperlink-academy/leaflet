import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";
import { AddToHomeSmall, HomeSmall } from "./Icons";
import { HoverButton } from "./Buttons";
import { useParams, useSearchParams } from "next/navigation";
import { useIdentityData } from "./IdentityProvider";
import { useReplicache } from "src/replicache";
import { addLeafletToHome } from "actions/addLeafletToHome";
import { useSmoker } from "./Toast";

export function HomeButton() {
  let { permissions } = useEntitySetContext();
  let searchParams = useSearchParams();

  if (permissions.write)
    return (
      <>
        <Link href="/home" prefetch>
          <HoverButton
            noLabelOnMobile
            icon={<HomeSmall />}
            label="Go Home"
            background="bg-accent-1"
            text="text-accent-2"
          />
        </Link>
        <AddToHomeButton />
      </>
    );
  return null;
}

const AddToHomeButton = (props: {}) => {
  let { permission_token } = useReplicache();
  let { identity, mutate } = useIdentityData();
  let smoker = useSmoker();
  if (
    identity?.permission_token_on_homepage.find(
      (pth) => pth.permission_tokens.id === permission_token.id,
    )
  )
    return null;
  return (
    <button
      onClick={async (e) => {
        await addLeafletToHome(permission_token.id);
        mutate((identity) => {
          if (!identity) return;
          return {
            ...identity,
            permission_token_on_homepage: [
              ...identity.permission_token_on_homepage,
              {
                created_at: new Date().toISOString(),
                permission_tokens: permission_token,
              },
            ],
          };
        });
        smoker({
          position: {
            x: e.clientX + 64,
            y: e.clientY,
          },
          text: "Leaflet added to your home!",
        });
      }}
    >
      <HoverButton
        noLabelOnMobile
        icon={<AddToHomeSmall />}
        label="Add to Home"
        background="bg-accent-1"
        text="text-accent-2"
      />
    </button>
  );
};
