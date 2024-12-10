"use client";
import { getIdentityData } from "actions/getIdentityData";
import { createContext, useContext } from "react";
import useSWR from "swr";

let IdentityContext = createContext({
  identity: null as Awaited<ReturnType<typeof getIdentityData>>,
});
export const useIdentityData = () => useContext(IdentityContext);
export function IdentityContextProvider(props: {
  children: React.ReactNode;
  initialValue: Awaited<ReturnType<typeof getIdentityData>>;
}) {
  let { data: identity } = useSWR("identity", () => getIdentityData(), {
    fallbackData: props.initialValue,
  });
  return (
    <IdentityContext.Provider value={{ identity }}>
      {props.children}
    </IdentityContext.Provider>
  );
}
