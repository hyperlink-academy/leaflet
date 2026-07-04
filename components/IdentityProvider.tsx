"use client";
import { getIdentityData } from "actions/getIdentityData";
import { getCurrentSessionToken } from "actions/savedAccounts";
import { createContext, useContext, useEffect } from "react";
import useSWR, { KeyedMutator, mutate } from "swr";
import type { DashboardState } from "./PageLayouts/dashboardState";
import { supabaseBrowserClient } from "supabase/browserClient";
import { produce, Draft } from "immer";
import {
  mutateSavedAccounts,
  readSavedAccountEntries,
  upsertSavedAccountEntry,
} from "src/hooks/useSavedAccounts";

export type InterfaceState = {
  dashboards: { [id: string]: DashboardState | undefined };
};
export type Identity = Awaited<ReturnType<typeof getIdentityData>>;
let IdentityContext = createContext({
  identity: null as Identity,
  mutate: (() => {}) as KeyedMutator<Identity>,
});
export const useIdentityData = () => useContext(IdentityContext);

export function mutateIdentityData(
  mutate: KeyedMutator<Identity>,
  recipe: (draft: Draft<NonNullable<Identity>>) => void,
) {
  mutate(
    (data) => {
      if (!data) return data;
      return produce(data, recipe);
    },
    { revalidate: false },
  );
}
export function IdentityContextProvider(props: {
  children: React.ReactNode;
  initialValue: Identity;
}) {
  let { data: identity, mutate } = useSWR("identity", () => getIdentityData(), {
    fallbackData: props.initialValue,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: false,
  });
  useEffect(() => {
    mutate(props.initialValue);
  }, [props.initialValue]);
  // Remember the current session in the saved-accounts list so the account
  // switcher can offer it later. The auth_token cookie is httpOnly, so the
  // token has to be fetched from the server; when the list already leads with
  // this identity, skip that round trip and just refresh the display snapshot.
  useEffect(() => {
    if (!identity?.id) return;
    let identityId = identity.id;
    let snapshot = {
      email: identity.email,
      did: identity.atp_did,
      handle: identity.bsky_profiles?.record.handle ?? null,
      displayName: identity.bsky_profiles?.record.displayName ?? null,
      avatar: identity.bsky_profiles?.record.avatar ?? null,
    };
    let existing = readSavedAccountEntries()[0];
    if (existing?.identity === identityId) {
      upsertSavedAccountEntry({ ...existing, ...snapshot });
      return;
    }
    getCurrentSessionToken().then((session) => {
      if (session?.identity !== identityId) return;
      upsertSavedAccountEntry({
        token: session.token,
        identity: identityId,
        ...snapshot,
      });
      mutateSavedAccounts();
    });
  }, [identity?.id]);
  useEffect(() => {
    if (!identity?.atp_did) return;
    let supabase = supabaseBrowserClient();
    let channel = supabase.channel(`identity.atp_did:${identity.atp_did}`);
    channel.on("broadcast", { event: "notification" }, () => {
      mutate();
    });
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [identity?.atp_did]);
  return (
    <IdentityContext.Provider value={{ identity, mutate }}>
      {props.children}
    </IdentityContext.Provider>
  );
}
