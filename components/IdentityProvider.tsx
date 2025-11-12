"use client";
import { getIdentityData } from "actions/getIdentityData";
import { createContext, useContext, useEffect } from "react";
import useSWR, { KeyedMutator, mutate } from "swr";
import { DashboardState } from "./PageLayouts/DashboardLayout";
import { supabaseBrowserClient } from "supabase/browserClient";

export type InterfaceState = {
  dashboards: { [id: string]: DashboardState | undefined };
};
type Identity = Awaited<ReturnType<typeof getIdentityData>>;
let IdentityContext = createContext({
  identity: null as Identity,
  mutate: (() => {}) as KeyedMutator<Identity>,
});
export const useIdentityData = () => useContext(IdentityContext);
export function IdentityContextProvider(props: {
  children: React.ReactNode;
  initialValue: Identity;
}) {
  let { data: identity, mutate } = useSWR("identity", () => getIdentityData(), {
    fallbackData: props.initialValue,
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
    </IdentityContext.Provider>
  );
}
