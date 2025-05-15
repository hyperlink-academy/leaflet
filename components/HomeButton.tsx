"use client";
import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";
import { ActionButton } from "components/ActionBar/ActionButton";
import { useParams, useSearchParams } from "next/navigation";
import { useIdentityData } from "./IdentityProvider";
import { useReplicache } from "src/replicache";
import { addLeafletToHome } from "actions/addLeafletToHome";
import { useSmoker } from "./Toast";
import { AddToHomeSmall } from "./Icons/AddToHomeSmall";
import { HomeSmall } from "./Icons/HomeSmall";
import { permission } from "process";

export function HomeButton(props: { isPublication?: boolean }) {
  let { permissions } = useEntitySetContext();
  let searchParams = useSearchParams();

  if (permissions.write || props.isPublication)
    return (
      <>
        <Link
          href="/home"
          prefetch
          className="hover:no-underline"
          style={{ textDecorationLine: "none !important" }}
        >
          <ActionButton icon={<HomeSmall />} label="Go Home" />
        </Link>
        {!props.isPublication && <AddToHomeButton />}
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
    ) ||
    !identity
  )
    return null;
  return (
    <ActionButton
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
      icon={<AddToHomeSmall />}
      label="Add to Home"
    />
  );
};
