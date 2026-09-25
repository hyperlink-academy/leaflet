"use client";
import useSWR from "swr";
import { getMembershipTiers } from "actions/publications/joinMembership";

// Cached per publication across every subscribe surface.
export function useMembershipTiers(publicationUri: string | undefined) {
  const { data } = useSWR(
    publicationUri ? `membership-tiers-${publicationUri}` : null,
    () => getMembershipTiers(publicationUri!),
    { revalidateOnFocus: false },
  );
  const tiers = data ?? null;
  return {
    tiers,
    hasPaidTiers: !!tiers?.paid.length,
  };
}
