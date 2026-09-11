"use client";

import { type PublicationSubscription } from "actions/reader/getSubscriptions";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import {
  centeredGridCellStyle,
  centeredGridStyle,
} from "src/utils/centeredGrid";

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
    <div className="flex flex-col gap-2 w-full max-w-full sm:w-2xl pt-6">
      <h4>Check out {props.publicationName}'s recommendations! </h4>
      <div
        className="light-container p-2 flex flex-col gap-2.5 text-left sm:grid sm:gap-x-2"
        style={centeredGridStyle(props.listings.length)}
      >
        {props.listings.map((listing, index) => (
          <div
            key={listing.uri}
            className="flex"
            style={centeredGridCellStyle(index, props.listings.length)}
          >
            <PubListing
              compact
              showSubscribeButton
              subscribeSource={{
                placement: "recommendation",
                publication: props.recommendingPublicationUri,
              }}
              {...listing}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
