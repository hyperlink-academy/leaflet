"use client";

import { type PublicationSubscription } from "actions/reader/getSubscriptions";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import {
  centeredGridCellStyle,
  centeredGridStyle,
} from "src/utils/centeredGrid";
import type { SubscriptionSource } from "src/subscriptionSource";

export const RecommendedPubsGrid = (props: {
  listings: PublicationSubscription[];
  subscribeSource?: SubscriptionSource;
  compact?: boolean;
  className?: string;
}) => {
  if (props.compact)
    return (
      <div
        className={`flex flex-row gap-3 text-left overflow-x-auto p-1 -m-1 ${props.className || ""}`}
      >
        {props.listings.map((listing) => (
          <div key={listing.uri} className="flex sm:w-56 w-32 shrink-0">
            <PubListing
              compact
              showSubscribeButton
              subscribeSource={props.subscribeSource}
              {...listing}
            />
          </div>
        ))}
      </div>
    );

  return (
    <div
      className={`flex flex-col gap-2 text-left sm:grid ${props.className || ""}`}
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
            subscribeSource={props.subscribeSource}
            {...listing}
          />
        </div>
      ))}
    </div>
  );
};
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
      <div className="light-container p-2">
        <RecommendedPubsGrid
          listings={props.listings}
          subscribeSource={{
            placement: "recommendation",
            publication: props.recommendingPublicationUri,
          }}
        />
      </div>
    </div>
  );
};
