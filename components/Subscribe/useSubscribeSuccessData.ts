"use client";

import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { getPublicationsByUris } from "actions/reader/getSubscriptions";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";
export function useSubscribeSuccessData(publicationUri: string | undefined) {
  let { data: publication, isLoading: publicationLoading } =
    useStandardSitePublication(publicationUri);
  let { loading: listingsLoading, listings } =
    usePublicationRecommendationListings(publicationUri);

  return {
    loading: publicationLoading || listingsLoading,
    publication: publication ?? undefined,
    listings,
  };
}

export function usePublicationRecommendationListings(
  publicationUri: string | undefined,
) {
  let { data: recommendedUris, isLoading: recommendationsLoading } = useSWR(
    publicationUri ? ["publication_recommendations", publicationUri] : null,
    async () => {
      let res = await callRPC("get_publication_recommendations", {
        publication: publicationUri!,
      });
      return res.result.recommendations;
    },
    { revalidateOnFocus: false },
  );

  let { data: listings, isLoading: listingsLoading } = useSWR(
    recommendedUris?.length
      ? ["recommended_pub_listings", recommendedUris.join(",")]
      : null,
    async () => {
      let uris = recommendedUris!;
      let listings = await getPublicationsByUris(uris);
      // Preserve the recommended order; drop pubs that no longer resolve.
      return uris.flatMap((uri) => listings.find((l) => l.uri === uri) ?? []);
    },
    { revalidateOnFocus: false },
  );

  return {
    loading: recommendationsLoading || listingsLoading,
    listings: listings ?? [],
  };
}

// Warms the SWR caches the success modals read from, so opening one on a
// publication page doesn't flash a loading spinner. Mount anywhere the
// publication's own subscribe UI can appear; the fetches dedupe by key.
export function SubscribeSuccessPrefetch(props: { publicationUri: string }) {
  useSubscribeSuccessData(props.publicationUri);
  return null;
}
