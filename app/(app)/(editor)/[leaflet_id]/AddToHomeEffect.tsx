"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { mutate as swrMutate } from "swr";
import { addDocToHome } from "src/utils/homeDocsStorage";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";
import { replaceWithoutParams } from "src/utils/replaceWithoutParams";

export function useAddToHomeParam() {
  return useSearchParams().has("addToHome");
}

export function AddToHomeEffect() {
  let searchParams = useSearchParams();
  let pathname = usePathname();
  let router = useRouter();
  let shouldAdd = searchParams.has("addToHome");
  let { permission_token } = useReplicache();
  let { identity, identityPending } = useIdentityData();
  let ran = useRef(false);

  useEffect(() => {
    // Identity arrives client-side on this route; deciding on the pending
    // value would file a logged-in user's leaflet under localStorage.
    if (!shouldAdd || ran.current || identityPending) return;
    ran.current = true;

    // Authed users are added to their homepage server-side in createNewLeaflet.
    // Here we only need to handle the unauthed case via localStorage.
    if (!identity) {
      addDocToHome(permission_token);
      swrMutate("leaflets");
    }

    replaceWithoutParams(router, pathname, searchParams, ["addToHome"]);
  }, [
    shouldAdd,
    identity,
    identityPending,
    permission_token,
    router,
    pathname,
    searchParams,
  ]);

  return null;
}
