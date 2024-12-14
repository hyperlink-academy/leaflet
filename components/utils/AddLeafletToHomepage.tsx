"use client";

import { addDocToHome } from "app/home/storage";
import { useIdentityData } from "components/IdentityProvider";
import { useEffect } from "react";
import { useReplicache } from "src/replicache";

export function AddLeafletToHomepage() {
  let { permission_token } = useReplicache();
  let { identity } = useIdentityData();
  useEffect(() => {
    if (identity) return;
    if (permission_token.permission_token_rights[0].write) {
      try {
        addDocToHome(permission_token);
      } catch (e) {}
    }
  }, [permission_token, identity]);
  return null;
}
