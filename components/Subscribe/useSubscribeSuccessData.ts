"use client";

import useSWR from "swr";
import { getPublicationsByUris } from "actions/reader/getSubscriptions";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";

// Everything the post-subscribe success modals need about the publication: its
// name for the heading, and its recommendations hydrated into listings.
// `loading` covers both fetches so the modal can gate on a single flag.
export function useSubscribeSuccessData(publicationUri: string | undefined) {
  let { data: publication, isLoading: publicationLoading } =
    useStandardSitePublication(publicationUri);
  let recommendedUris = publication?.record.recommendations ?? [];

  let { data: listings, isLoading: listingsLoading } = useSWR(
    recommendedUris.length
      ? ["recommended_pub_listings", recommendedUris.join(",")]
      : null,
    async () => {
      let listings = await getPublicationsByUris(recommendedUris);
      // Preserve the recommended order; drop pubs that no longer resolve.
      return recommendedUris.flatMap(
        (uri) => listings.find((l) => l.uri === uri) ?? [],
      );
    },
    { revalidateOnFocus: false },
  );

  return {
    loading: publicationLoading || listingsLoading,
    publicationName: publication?.record.name,
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
