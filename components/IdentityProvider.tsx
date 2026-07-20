"use client";
import { getIdentityData } from "actions/getIdentityData";
import { getCurrentSessionToken } from "actions/savedAccounts";
import { createContext, Suspense, use, useContext, useEffect } from "react";
import useSWR, { KeyedMutator, mutate } from "swr";
import type { DashboardState } from "./PageLayouts/dashboardState";
import { supabaseBrowserClient } from "supabase/browserClient";
import { produce, Draft } from "immer";
import {
  mutateSavedAccounts,
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

// Two mounting modes:
// - `initialValue` (the (app) layout and nested dashboard layouts): identity
//   was awaited on the server and is present in the SSR HTML.
// - `identityPromise` (the (published) layout): identity streams in beside the
//   static shell and consumers render logged-out until it lands.
type IdentitySource =
  | { initialValue: Identity; identityPromise?: undefined }
  | { identityPromise: Promise<Identity>; initialValue?: undefined };

export function IdentityContextProvider(
  props: { children: React.ReactNode } & IdentitySource,
) {
  const seeded = props.identityPromise === undefined;
  let { data: identity, mutate } = useSWR("identity", () => getIdentityData(), {
    fallbackData: seeded ? props.initialValue : null,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: false,
  });
  useEffect(() => {
    if (seeded) mutate(props.initialValue);
  }, [seeded, props.initialValue]);
  // Remember the current session in the saved-accounts list so the account
  // switcher can offer it later. The token is always re-fetched — the cookie
  // is httpOnly, and a re-login mints a fresh token for the same identity, so
  // a shortcut that trusts the stored entry would pin a dead token forever.
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
    getCurrentSessionToken()
      .then((session) => {
        if (session?.identity !== identityId) return;
        upsertSavedAccountEntry({
          token: session.token,
          identity: identityId,
          ...snapshot,
        });
        mutateSavedAccounts();
      })
      // Recording is best-effort bookkeeping — a failed call must never
      // surface; the entry is written on a later load instead.
      .catch(() => {});
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
      {props.identityPromise ? (
        <Suspense fallback={null}>
          <IdentityStreamResolver
            identityPromise={props.identityPromise}
            mutate={mutate}
          />
        </Suspense>
      ) : null}
    </IdentityContext.Provider>
  );
}

function IdentityStreamResolver(props: {
  identityPromise: Promise<Identity>;
  mutate: KeyedMutator<Identity>;
}) {
  const identity = use(props.identityPromise);
  useEffect(() => {
    props.mutate(identity, { revalidate: false });
  }, [identity, props.mutate]);
  return null;
}
