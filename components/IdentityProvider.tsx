"use client";
import { getIdentityData } from "actions/getIdentityData";
import { createContext, useContext } from "react";
import useSWR, { KeyedMutator, mutate } from "swr";

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
  return (
    <IdentityContext.Provider value={{ identity, mutate }}>
      {props.children}
    </IdentityContext.Provider>
  );
}
