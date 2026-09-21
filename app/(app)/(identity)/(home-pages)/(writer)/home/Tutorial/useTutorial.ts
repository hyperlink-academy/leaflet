"use client";

import { setTutorialState } from "actions/setTutorialState";
import {
  mutateIdentityData,
  refreshIdentityData,
  useIdentityData,
} from "components/IdentityProvider";

export function useTutorial() {
  let { identity, mutate } = useIdentityData();

  // A user with nothing yet gets the full-bleed takeover; once they have any
  // publication or leaflet the tutorial steps aside into a banner under their
  // real content.
  let hasContent =
    (identity?.publications.length ?? 0) > 0 ||
    (identity?.contributor_publications?.length ?? 0) > 0 ||
    (identity?.permission_token_on_homepage.length ?? 0) > 0 ||
    (identity?.contributor_leaflets?.length ?? 0) > 0;

  return {
    tutorial: !!identity?.tutorial,
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
