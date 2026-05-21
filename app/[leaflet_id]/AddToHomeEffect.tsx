"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { mutate as swrMutate } from "swr";
import { addDocToHome } from "app/(home-pages)/(writer)/home/storage";
import { useIdentityData } from "components/IdentityProvider";
import { useReplicache } from "src/replicache";

export function useAddToHomeParam() {
  return useSearchParams().has("addToHome");
}

export function AddToHomeEffect() {
  let searchParams = useSearchParams();
  let pathname = usePathname();
  let router = useRouter();
  let shouldAdd = searchParams.has("addToHome");
  let { permission_token } = useReplicache();
  let { identity } = useIdentityData();
  let ran = useRef(false);

  useEffect(() => {
    if (!shouldAdd || ran.current) return;
    ran.current = true;

    // Authed users are added to their homepage server-side in createNewLeaflet.
    // Here we only need to handle the unauthed case via localStorage.
    if (!identity) {
      addDocToHome(permission_token);
      swrMutate("leaflets");
    }

    let params = new URLSearchParams(searchParams.toString());
    params.delete("addToHome");
    let qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [shouldAdd, identity, permission_token, router, pathname, searchParams]);

  return null;
}
