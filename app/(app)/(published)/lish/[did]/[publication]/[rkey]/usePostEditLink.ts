"use client";
import useSWR from "swr";
import { getPostEditLink } from "actions/getPostEditLink";
import { useIdentityData } from "components/IdentityProvider";

// Owner-only edit affordance on a published post. The token behind the link is
// a bearer capability, so it can't ship with the page (one cached payload,
// every reader) — we fetch it after identity resolves, and only for a viewer
// whose DID matches the publication owner's. That client-side match just avoids
// a pointless request; getPostEditLink re-checks ownership server-side.
export function usePostEditLink(
  documentUri: string | undefined,
  ownerDid: string | undefined,
) {
  let { identity } = useIdentityData();
  let isOwner =
    !!identity?.atp_did && !!ownerDid && identity.atp_did === ownerDid;
  let { data } = useSWR(
    isOwner && documentUri
      ? ["post-edit-link", documentUri, identity!.id]
      : null,
    ([, uri]) => getPostEditLink(uri),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  return data ? `https://leaflet.pub/${data}` : null;
}
