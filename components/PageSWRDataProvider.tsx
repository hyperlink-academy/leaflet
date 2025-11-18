"use client";
import { getRSVPData } from "actions/getRSVPData";
import { SWRConfig } from "swr";
import { useReplicache } from "src/replicache";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { getPollData } from "actions/pollActions";
import type { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { createContext, useContext } from "react";

export const StaticLeafletDataContext = createContext<
  null | GetLeafletDataReturnType["result"]["data"]
>(null);
export function PageSWRDataProvider(props: {
  leaflet_id: string;
  leaflet_data: GetLeafletDataReturnType["result"];
  rsvp_data: Awaited<ReturnType<typeof getRSVPData>>;
  poll_data: Awaited<ReturnType<typeof getPollData>>;
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fallback: {
          rsvp_data: props.rsvp_data,
          poll_data: props.poll_data,
          [`${props.leaflet_id}-leaflet_data`]: props.leaflet_data.data,
        },
      }}
    >
      {props.children}
    </SWRConfig>
  );
}

export function useRSVPData() {
  let { permission_token } = useReplicache();
  return useSWR(`rsvp_data`, () =>
    getRSVPData(
      permission_token.permission_token_rights.map((pr) => pr.entity_set),
    ),
  );
}
export function usePollData() {
  let { permission_token } = useReplicache();
  return useSWR(`poll_data`, () =>
    getPollData(
      permission_token.permission_token_rights.map((pr) => pr.entity_set),
    ),
  );
}

let useLeafletData = () => {
  let { permission_token } = useReplicache();
  let staticLeafletData = useContext(StaticLeafletDataContext);
  let res = useSWR(
    staticLeafletData ? null : `${permission_token.id}-leaflet_data`,
    async () =>
      permission_token.id
        ? (await callRPC("get_leaflet_data", { token_id: permission_token.id }))
            ?.result.data
        : undefined,
  );
  if (staticLeafletData) return { data: staticLeafletData, mutate: res.mutate };
  return res;
};
export function useLeafletPublicationData() {
  let { data, mutate } = useLeafletData();

  // First check for leaflets in publications
  let pubData =
    data?.leaflets_in_publications?.[0] ||
    data?.permission_token_rights[0].entity_sets?.permission_tokens?.find(
      (p) => p.leaflets_in_publications.length,
    )?.leaflets_in_publications?.[0];

  // If not found, check for standalone documents
  if (!pubData && data?.leaflets_to_documents?.[0]) {
    // Transform standalone document data to match the expected format
    let standaloneDoc = data.leaflets_to_documents[0];
    pubData = {
      ...standaloneDoc,
      publications: null, // No publication for standalone docs
      doc: standaloneDoc.document,
    } as any;
  }

  return {
    data: pubData || null,
    mutate,
  };
}
export function useLeafletDomains() {
  let { data, mutate } = useLeafletData();
  return { data: data?.custom_domain_routes, mutate: mutate };
}
