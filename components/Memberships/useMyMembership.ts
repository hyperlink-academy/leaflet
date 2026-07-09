"use client";
import useSWR, { mutate } from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { getMyMembershipForPublication } from "actions/memberships";

const membershipKey = (publicationUri: string) =>
  `my-membership-${publicationUri}`;

// The identity's membership rows gate the fetch (a null key skips it) — most
// viewers aren't paying members of the publication and never hit the server.
export function useMyMembership(publicationUri: string) {
  const { identity } = useIdentityData();
  const hasMembership = !!identity?.publication_memberships?.some(
    (m) => m.publication === publicationUri,
  );
  const { data, mutate, isLoading } = useSWR(
    hasMembership ? membershipKey(publicationUri) : null,
    () => getMyMembershipForPublication(publicationUri),
  );
  return { membership: data ?? null, isLoading, mutate };
}

export const mutateMyMembership = (publicationUri: string) =>
  mutate(membershipKey(publicationUri));
