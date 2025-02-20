"use client";
import { getRSVPData } from "actions/getRSVPData";
import { SWRConfig } from "swr";
import { useReplicache } from "src/replicache";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { getPollData } from "actions/pollActions";

export function PageSWRDataProvider(props: {
  leaflet_id: string;
  domains: { domain: string }[];
  rsvp_data: Awaited<ReturnType<typeof getRSVPData>>;
  poll_data: Awaited<ReturnType<typeof getPollData>>;
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fallback: {
          rsvp_data: props.rsvp_data,
          [`${props.leaflet_id}-domains`]: props.domains,
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
export function useLeafletDomains() {
  let { permission_token } = useReplicache();
  return useSWR(
    `${permission_token.id}-domains`,
    async () =>
      await callRPC("get_leaflet_domains", { id: permission_token.id }),
  );
}
