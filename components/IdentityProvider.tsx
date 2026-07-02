"use client";
import { getIdentityData } from "actions/getIdentityData";
import { createContext, Suspense, use, useContext, useEffect } from "react";
import useSWR, { KeyedMutator, mutate } from "swr";
import type { DashboardState } from "./PageLayouts/dashboardState";
import { supabaseBrowserClient } from "supabase/browserClient";
import { produce, Draft } from "immer";

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
  identityPromise: Promise<Identity>;
}) {
  let { data: identity, mutate } = useSWR("identity", () => getIdentityData(), {
    fallbackData: null,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: false,
  });
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
      {/* The identity streams in from the server after the static shell; the
          resolver lives in its own Suspense boundary so nothing else waits on
          it, and consumers render their logged-out state until it lands. */}
      <Suspense fallback={null}>
        <IdentityStreamResolver
          identityPromise={props.identityPromise}
          mutate={mutate}
        />
      </Suspense>
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
