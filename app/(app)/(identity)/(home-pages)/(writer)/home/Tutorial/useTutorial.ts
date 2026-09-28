"use client";

import { setTutorialState } from "actions/setTutorialState";
import {
  mutateIdentityData,
  refreshIdentityData,
  useIdentityData,
} from "components/IdentityProvider";
import useSWR from "swr";
import { create } from "zustand";
import { getHomeDocs } from "src/utils/homeDocsStorage";

const LOCAL_DISMISSED_KEY = "tutorialDismissed";

const useTutorialReplay = create<{ replaying: boolean }>(() => ({
  replaying: false,
}));

export function useTutorial() {
  let { identity, mutate } = useIdentityData();
  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs());
  // Logged-out users have no identity row to store the flag on.
  let { data: localDismissed, mutate: mutateLocalDismissed } = useSWR(
    LOCAL_DISMISSED_KEY,
    () => window.localStorage.getItem(LOCAL_DISMISSED_KEY) === "true",
  );

  let hasContent = identity
    ? identity.publications.length > 0 ||
      (identity.contributor_publications?.length ?? 0) > 0 ||
      identity.permission_token_on_homepage.length > 0 ||
      (identity.contributor_leaflets?.length ?? 0) > 0
    : !!localLeaflets?.some((d) => !d.hidden);

  let replaying = useTutorialReplay((s) => s.replaying);

  return {
    tutorial: identity
      ? !!identity.tutorial
      : localLeaflets !== undefined && localDismissed === false && !hasContent,
    hasContent,
    replaying,
    startTutorial: () => useTutorialReplay.setState({ replaying: true }),
    removeTutorial: async () => {
      useTutorialReplay.setState({ replaying: false });
      if (!identity) {
        window.localStorage.setItem(LOCAL_DISMISSED_KEY, "true");
        mutateLocalDismissed(true, { revalidate: false });
        return;
      }
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
