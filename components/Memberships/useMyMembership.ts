"use client";
import useSWR, { mutate } from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { getMyMembershipForPublication } from "actions/memberships";

const membershipKey = (publicationUri: string) =>
  `my-membership-${publicationUri}`;

// The identity's paid row gates the fetch (a null key skips it) — just its
// presence, not whether it's currently active, since the cached identity seed
// can lag the billing state (e.g. an unreconciled Stripe webhook) and a
// stale-active row must still load so the UI can offer resume/cancel. Free
// memberships resolve from subscription state and never need billing details.
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
