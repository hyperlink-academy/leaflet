"use client";
import { getIdentityData } from "actions/getIdentityData";
import { getViewerIdentity } from "actions/viewerIdentity";
import { getCurrentSessionToken } from "actions/savedAccounts";
import { createContext, useContext, useEffect } from "react";
import useSWR, { KeyedMutator, mutate, useSWRConfig } from "swr";
import type { DashboardState } from "./PageLayouts/dashboardState";
import { supabaseBrowserClient } from "supabase/browserClient";
import { produce, Draft } from "immer";
import {
  mutateSavedAccounts,
  upsertSavedAccountEntry,
} from "src/hooks/useSavedAccounts";
import { hasSessionMarker } from "src/sessionMarker";

export type InterfaceState = {
  dashboards: { [id: string]: DashboardState | undefined };
};
export type Identity = Awaited<ReturnType<typeof getIdentityData>>;
// Two SWR keys on purpose: dashboard surfaces are seeded server-side with the
// full identity ("identity"), published pages fetch a slim variant client-side
// ("viewer-identity"). Sharing one key would let a slim/null entry from a
// published page win the first frame of a dashboard render (the swr module
// cache beats fallbackData) and vice versa.
export const VIEWER_IDENTITY_KEY = "viewer-identity";
let IdentityContext = createContext({
  identity: null as Identity,
  mutate: (() => {}) as KeyedMutator<Identity>,
  // True only on published pages while the mount-time viewer fetch is still in
  // flight — lets identity-gated affordances show a pending state instead of
  // briefly rendering as logged-out for a viewer who has a session.
  identityPending: false,
});
export const useIdentityData = () => useContext(IdentityContext);

// Use these (not bare mutate("identity")) after login/logout/subscribe state
// changes so both provider flavors observe the change.
export function refreshIdentityData() {
  mutate("identity");
  mutate(VIEWER_IDENTITY_KEY);
}
export function clearIdentityData() {
  mutate("identity", null, { revalidate: false });
  mutate(VIEWER_IDENTITY_KEY, null, { revalidate: false });
}

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
    // revalidate:false — initialValue IS the fresh server value; the default
    // would kick off a redundant full getIdentityData round-trip per render.
    mutate(props.initialValue, { revalidate: false });
  }, [props.initialValue]);
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
    <IdentityContext.Provider
      value={{ identity, mutate, identityPending: false }}
    >
      {props.children}
    </IdentityContext.Provider>
  );
}

// Identity for statically-rendered published pages: no server seed (the page
// HTML must not depend on the request), fetched on mount instead — and only
// when the session marker cookie says a session exists, so anonymous readers
// and crawlers never trigger the round-trip. Seeds from the dashboard's cache
// entry when client-navigating over from a dashboard surface so known-logged-in
// state never flashes logged-out.
export function ViewerIdentityProvider(props: { children: React.ReactNode }) {
  const { cache } = useSWRConfig();
  // Read the dashboard cache every render, not once: on identity-gated routes
  // nested in the published group (pub dashboard/edit) the server-fed provider
  // below us populates "identity" only after our first render, and navigating
  // from there to a public page is exactly the frame where the seed must be
  // picked up so a known-logged-in viewer never flashes logged-out.
  const seed = (cache.get("identity")?.data as Identity) ?? null;
  let {
    data: identity,
    mutate,
    isValidating,
  } = useSWR<Identity>(VIEWER_IDENTITY_KEY, () => getViewerIdentity(), {
    fallbackData: seed,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: false,
  });
  // The marker gate is the fetch policy: sessions fetch once per hard load,
  // anonymous readers and crawlers never do. Runs even when seeded — the seed
  // may be stale (it outlives dashboard SSRs), and the fallback keeps the UI
  // populated while the refresh is in flight.
  useEffect(() => {
    if (!hasSessionMarker()) return;
    mutate();
  }, []);
  return (
    <IdentityContext.Provider
      value={{
        identity: identity ?? null,
        mutate,
        identityPending: !identity && isValidating,
      }}
    >
      {props.children}
    </IdentityContext.Provider>
  );
}
