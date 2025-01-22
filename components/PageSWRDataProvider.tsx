"use client";
import { getRSVPData } from "actions/getRSVPData";
import { SWRConfig } from "swr";
import { useReplicache } from "src/replicache";
import useSWR from "swr";
import { getLeafletDomains } from "actions/domains/getLeafletDomains";

export function PageSWRDataProvider(props: {
  leaflet_id: string;
  domains: { domain: string }[];
  rsvp_data: Awaited<ReturnType<typeof getRSVPData>>;
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
export function useLeafletDomains() {
  let { permission_token } = useReplicache();
  return useSWR(`${permission_token.id}-domains`, () =>
    getLeafletDomains(permission_token.id),
  );
}
