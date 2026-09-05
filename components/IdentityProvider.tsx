"use client";
import { getIdentityData } from "actions/getIdentityData";
import {
  getViewerIdentity,
  getViewerIdentityOnPublishedPage,
} from "actions/viewerIdentity";
import { getCurrentSessionToken } from "actions/savedAccounts";
import {
  createContext,
  use,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import useSWR, { KeyedMutator, mutate, useSWRConfig } from "swr";
import type { DashboardState } from "./PageLayouts/dashboardState";
import { supabaseBrowserClient } from "supabase/browserClient";
import { produce, Draft } from "immer";
import {
  mutateSavedAccounts,
  upsertSavedAccountEntry,
} from "src/hooks/useSavedAccounts";
import { hasSessionMarker } from "src/sessionMarker";
import {
  useIdentityChangeListener,
  useReloadOnIdentityChange,
} from "src/identityBroadcast";

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
// Exported for test harness pages that mock the viewer (app/test/*).
export let IdentityContext = createContext({
  identity: null as Identity,
  mutate: (() => {}) as KeyedMutator<Identity>,
  // True only on published pages while the mount-time viewer fetch is still in
  // flight — lets identity-gated affordances show a pending state instead of
  // briefly rendering as logged-out for a viewer who has a session.
  identityPending: false,
});
export const useIdentityData = () => useContext(IdentityContext);

// The marker read has to land before paint, but this provider is also
// server-rendered, where useLayoutEffect warns and never runs anyway.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  // A promise lets the server mount this provider without awaiting identity
  // first, so sibling server work (e.g. the home leaflet fetch) runs in
  // parallel; use() suspends at the mounting segment's own boundary instead of
  // holding up the whole RSC tree. identityPromise must be a server-created
  // promise — a promise built during a client render changes each render and
  // use() would suspend forever. Client-side callers (tests) pass the plain
  // initialValue instead.
  identityPromise?: Promise<Identity>;
  initialValue?: Identity;
}) {
  const initialValue = props.identityPromise
    ? use(props.identityPromise)
    : (props.initialValue ?? null);
  let { data: identity, mutate } = useSWR("identity", () => getIdentityData(), {
    fallbackData: initialValue,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: false,
  });
  useEffect(() => {
    // revalidate:false — initialValue is a full server value; the default
    // would kick off a redundant full getIdentityData round-trip per render.
    // Keep whichever snapshot was fetched later: nav payloads are prefetched
    // and router-cached, so a seed can predate a client-side revalidation
    // (e.g. the notifications page marks-all-read and refetches, but the
    // eagerly-prefetched nav targets still carry the old unread count).
    mutate(
      (current) =>
        current && initialValue && current.fetched_at > initialValue.fetched_at
          ? current
          : initialValue,
      { revalidate: false },
    );
  }, [initialValue]);
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
  useReloadOnIdentityChange(identity?.id ?? null);
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

// Identity for the leaflet editor (/[leaflet_id]), whose server render is
// identity-free so nothing above the page blocks on request-coupled reads:
// same fetch policy as ViewerIdentityProvider below (no server seed,
// mount-time fetch gated on the session marker) but fetching the full
// getIdentityData payload on the dashboard "identity" key — editor chrome
// reads embeds the slim viewer payload leaves empty (publications,
// custom_domains, permission_token_on_homepage), and sharing the dashboard key
// means a client-nav from /home picks up the already-cached full identity
// instantly.
// Deliberately not seeded from "viewer-identity": a slim entry is non-null but
// has those embeds empty, which reads as "logged in with no publications"
// rather than "still loading".
export function ClientIdentityProvider(props: { children: React.ReactNode }) {
  let {
    data: identity,
    mutate,
    isValidating,
  } = useSWR<Identity>("identity", () => getIdentityData(), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: false,
  });
  const [markerPending, setMarkerPending] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (hasSessionMarker()) setMarkerPending(true);
  }, []);
  // The marker gate is the fetch policy: sessions fetch once per hard load,
  // anonymous editors never do. Runs even when the dashboard cache already
  // holds an entry — it may be stale, and the cached value keeps the UI
  // populated while the refresh is in flight.
  useEffect(() => {
    if (!hasSessionMarker()) return;
    mutate().finally(() => setMarkerPending(false));
  }, []);
  useReloadOnIdentityChange(identity?.id ?? null);
  return (
    <IdentityContext.Provider
      value={{
        identity: identity ?? null,
        mutate,
        identityPending: !identity && (markerPending || isValidating),
      }}
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
export function ViewerIdentityProvider(props: {
  children: React.ReactNode;
  // Set by the published layout so the identity fetch also records the viewer
  // as an active reader; the editor layout's mount stays silent.
  published?: boolean;
}) {
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
  } = useSWR<Identity>(
    VIEWER_IDENTITY_KEY,
    () =>
      props.published
        ? getViewerIdentityOnPublishedPage()
        : getViewerIdentity(),
    {
      fallbackData: seed,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: false,
    },
  );
  // isValidating alone leaves a gap: it only flips once the fetcher below has
  // actually started, so the frame right after hydration would render as
  // logged-out for a viewer who has a session — the flash this flag exists to
  // prevent. The marker is readable synchronously, so claim "pending" from it
  // before the browser paints and drop the claim when the fetch settles.
  const [markerPending, setMarkerPending] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (hasSessionMarker()) setMarkerPending(true);
  }, []);
  // The marker gate is the fetch policy: sessions fetch once per hard load,
  // anonymous readers and crawlers never do. Runs even when seeded — the seed
  // may be stale (it outlives dashboard SSRs), and the fallback keeps the UI
  // populated while the refresh is in flight.
  useEffect(() => {
    if (!hasSessionMarker()) return;
    mutate().finally(() => setMarkerPending(false));
  }, []);
  // A soft revalidate is enough here (vs the reload identity-keyed surfaces
  // need): published pages hold no Replicache or realtime state, and the
  // identity-gated islands key their fetches by viewer so they refetch once
  // the new identity lands.
  useIdentityChangeListener(() => {
    mutate();
  });
  return (
    <IdentityContext.Provider
      value={{
        identity: identity ?? null,
        mutate,
        identityPending: !identity && (markerPending || isValidating),
      }}
    >
      {props.children}
    </IdentityContext.Provider>
  );
}
