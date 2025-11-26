"use client";
import { getRSVPData } from "actions/getRSVPData";
import { SWRConfig } from "swr";
import { useReplicache } from "src/replicache";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { getPollData } from "actions/pollActions";
import type { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { createContext, useContext } from "react";
import { getPublicationMetadataFromLeafletData } from "src/utils/getPublicationMetadataFromLeafletData";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { AtUri } from "@atproto/syntax";

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
  let pubData = getPublicationMetadataFromLeafletData(data);

  return {
    data: pubData || null,
    mutate,
  };
}
export function useLeafletDomains() {
  let { data, mutate } = useLeafletData();
  return { data: data?.custom_domain_routes, mutate: mutate };
}

export function useLeafletPublicationStatus() {
  const data = useContext(StaticLeafletDataContext);
  if (!data) return null;

  const publishedInPublication = data.leaflets_in_publications?.find(
    (l) => l.doc,
  );
  const publishedStandalone = data.leaflets_to_documents?.find(
    (l) => !!l.documents,
  );

  const documentUri =
    publishedInPublication?.documents?.uri ?? publishedStandalone?.document;

  // Compute the full post URL for sharing
  let postShareLink: string | undefined;
  if (publishedInPublication?.publications && publishedInPublication.documents) {
    // Published in a publication - use publication URL + document rkey
    const docUri = new AtUri(publishedInPublication.documents.uri);
    postShareLink = `${getPublicationURL(publishedInPublication.publications)}/${docUri.rkey}`;
  } else if (publishedStandalone?.document) {
    // Standalone published post - use /p/{did}/{rkey} format
    const docUri = new AtUri(publishedStandalone.document);
    postShareLink = `/p/${docUri.host}/${docUri.rkey}`;
  }

  return {
    token: data,
    leafletId: data.root_entity,
    shareLink: data.id,
    // Draft state - in a publication but not yet published
    draftInPublication:
      data.leaflets_in_publications?.[0]?.publication ?? undefined,
    // Published state
    isPublished: !!(publishedInPublication || publishedStandalone),
    publishedAt:
      publishedInPublication?.documents?.indexed_at ??
      publishedStandalone?.documents?.indexed_at,
    documentUri,
    // Full URL for sharing published posts
    postShareLink,
  };
}
