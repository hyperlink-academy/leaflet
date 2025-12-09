"use client";
import Link from "next/link";
import { useEntitySetContext } from "../../../components/EntitySetProvider";
import { ActionButton } from "components/ActionBar/ActionButton";
import { useSearchParams } from "next/navigation";
import { useIdentityData } from "../../../components/IdentityProvider";
import { useReplicache } from "src/replicache";
import { addLeafletToHome } from "actions/addLeafletToHome";
import { useSmoker } from "../../../components/Toast";
import { AddToHomeSmall } from "../../../components/Icons/AddToHomeSmall";
import { HomeSmall } from "../../../components/Icons/HomeSmall";
import { produce } from "immer";

export function HomeButton() {
  let { permissions } = useEntitySetContext();
  let searchParams = useSearchParams();

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
      {<AddToHomeButton />}
    </>
  );
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
          return produce<typeof identity>((draft) => {
            draft.permission_token_on_homepage.push({
              created_at: new Date().toISOString(),
              archived: null,
              permission_tokens: {
                ...permission_token,
                leaflets_to_documents: null,
                leaflets_in_publications: [],
              },
            });
          })(identity);
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
