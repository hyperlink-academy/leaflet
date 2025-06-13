"use client";

import type { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { callRPC } from "app/api/rpc/client";
import { createContext, useContext } from "react";
import useSWR, { SWRConfig } from "swr";

const PublicationContext = createContext({ name: "", did: "" });
export function PublicationSWRDataProvider(props: {
  publication_name: string;
  publication_did: string;
  publication_data: GetPublicationDataReturnType["result"];
  children: React.ReactNode;
}) {
  return (
    <PublicationContext
      value={{ name: props.publication_name, did: props.publication_did }}
    >
      <SWRConfig
        value={{
          fallback: {
            "publication-data": props.publication_data,
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
  let { data, mutate } = useSWR(
    "publication-data",
    async () =>
      (await callRPC("get_publication_data", { publication_name: name, did }))
        ?.result,
  );
  return { data, mutate };
}
