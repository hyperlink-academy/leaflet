"use client";

import { setTutorialState } from "actions/setTutorialState";
import {
  mutateIdentityData,
  refreshIdentityData,
  useIdentityData,
} from "components/IdentityProvider";
import useSWR from "swr";
import { getHomeDocs } from "src/utils/homeDocsStorage";

export function useTutorial() {
  let { identity, mutate } = useIdentityData();
  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs());


  let hasContent = identity
    ? identity.publications.length > 0 ||
      (identity.contributor_publications?.length ?? 0) > 0 ||
      identity.permission_token_on_homepage.length > 0 ||
      (identity.contributor_leaflets?.length ?? 0) > 0
    : !!localLeaflets?.some((d) => !d.hidden);

  return {

    tutorial: identity
      ? !!identity.tutorial
      : localLeaflets !== undefined && !hasContent,
    hasContent,
    removeTutorial: async () => {
      // Optimistic without a revalidate: a refetch racing the write below
      // would hand back tutorial: true and flash the banner back in.
      mutateIdentityData(mutate, (draft) => {
        draft.tutorial = false;
      });
      await setTutorialState(false);
      refreshIdentityData();
    },
  };
}
