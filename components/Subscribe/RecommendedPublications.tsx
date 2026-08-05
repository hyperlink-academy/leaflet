"use client";

import useSWR from "swr";
import {
  getPublicationsByUris,
  type PublicationSubscription,
} from "actions/reader/getSubscriptions";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";

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

// Post-subscribe "check out these publications" section. Renders nothing if
// the publication doesn't recommend anyone.
export const RecommendedPublications = (props: {
  publicationName: string | undefined;
  listings: PublicationSubscription[];
}) => {
  if (props.listings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-full sm:w-2xl">
      <hr className="my-4 border-border-light" />
      <h4>
        Check out these other publications that {props.publicationName}{" "}
        recommends
      </h4>
      <div className="flex flex-col gap-2.5 text-left sm:grid sm:grid-flow-col sm:auto-cols-fr">
        {props.listings.map((listing) => (
          <PubListing
            key={listing.uri}
            compact
            showSubscribeButton
            {...listing}
          />
        ))}
      </div>
    </div>
  );
};
