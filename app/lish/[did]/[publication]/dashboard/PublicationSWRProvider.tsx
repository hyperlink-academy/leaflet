"use client";

import type { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { callRPC } from "app/api/rpc/client";
import { createContext, useContext, useEffect } from "react";
import useSWR, { SWRConfig, mutate } from "swr";

const PublicationContext = createContext({ name: "", did: "" });
export function PublicationSWRDataProvider(props: {
  publication_rkey: string;
  publication_did: string;
  publication_data: GetPublicationDataReturnType["result"];
  children: React.ReactNode;
}) {
  let key = `publication-data-${props.publication_did}-${props.publication_rkey}`;
  useEffect(() => {
    console.log("UPDATING");
    mutate(key, props.publication_data);
  }, [props.publication_data]);
  return (
    <PublicationContext
      value={{ name: props.publication_rkey, did: props.publication_did }}
    >
      <SWRConfig
        value={{
          fallback: {
            [key]: props.publication_data,
          },
        }}
      >
        {props.children}
      </SWRConfig>
    </PublicationContext>
  );
}

export function usePublicationData() {
  let { name, did } = useContext(PublicationContext);
  let key = `publication-data-${did}-${name}`;
  let { data, mutate } = useSWR(
    key,
    async () =>
      (await callRPC("get_publication_data", { publication_name: name, did }))
        ?.result,
  );
  return { data, mutate };
}
