"use client";
import useSWR from "swr";
import { getJoinableTiers } from "actions/publications/joinMembership";

// The joinable tier list for a publication, cached per-uri across every
// subscribe surface on the page. SubscribeButton/SubscribeInput use it to
// swap themselves for PaidSubscribeButton when a pub has paid tiers.
export function useJoinableTiers(publicationUri: string) {
  const { data } = useSWR(
    `joinable-tiers-${publicationUri}`,
    () => getJoinableTiers(publicationUri),
    { revalidateOnFocus: false },
  );
  const tiers = data ?? null;
  return { tiers, hasPaidTiers: !!tiers?.some((t) => !t.is_free) };
}
