"use client";
import { getRSVPData } from "actions/getRSVPData";
import { SWRConfig } from "swr";
import { useReplicache } from "src/replicache";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { getPollData } from "actions/pollActions";
import type { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";

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
          [`${props.leaflet_id}-leaflet_data`]: props.leaflet_data,
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
  return useSWR(`${permission_token.id}-leaflet_data`, async () =>
    permission_token.id
      ? (await callRPC("get_leaflet_data", { token_id: permission_token.id }))
          ?.result
      : undefined,
  );
};
export function useLeafletPublicationData() {
  let { data, mutate } = useLeafletData();
  return {
    data: data?.data?.leaflets_in_publications || [],
    mutate,
  };
}
export function useLeafletDomains() {
  let { data, mutate } = useLeafletData();
  return { data: data?.data?.custom_domain_routes, mutate: mutate };
}
