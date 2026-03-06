"use client";
import { getIdentityData } from "actions/getIdentityData";
import { createContext, useContext, useEffect } from "react";
import useSWR, { KeyedMutator, mutate } from "swr";
import { DashboardState } from "./PageLayouts/DashboardLayout";
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
