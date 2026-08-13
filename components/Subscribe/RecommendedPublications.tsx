"use client";

import { type PublicationSubscription } from "actions/reader/getSubscriptions";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";

// Post-subscribe "check out these publications" section. Renders nothing if
// the publication doesn't recommend anyone.
export const RecommendedPublications = (props: {
  publicationName: string | undefined;
  // The publication whose recommendations these are — attributes any subscribe
  // made here back to it in analytics.
  recommendingPublicationUri?: string;
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
            subscribeSource={{
              placement: "recommendation",
              publication: props.recommendingPublicationUri,
            }}
            {...listing}
          />
        ))}
      </div>
    </div>
  );
};
