"use client";

import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import { DotLoader } from "components/utils/DotLoader";
import { RecommendedPublications } from "./RecommendedPublications";
import { useSubscribeSuccessData } from "./useSubscribeSuccessData";

// Shared frame for the post-subscribe success modals: the heading, a listing
// for the publication just subscribed to (no subscribe button — they're already
// subscribed), the flow-specific body, and the publication's recommendations.
export const SubscribeSuccess = (props: {
  publicationUri?: string;
  children: React.ReactNode;
}) => {
  let { loading, publication, publicationName, listings } =
    useSubscribeSuccessData(props.publicationUri);
  if (loading)
    return (
      <div className="flex justify-center items-center py-8 text-secondary w-full max-w-full sm:min-w-md">
        <DotLoader />
      </div>
    );
  return (
    <div className="flex flex-col justify-center text-center pb-3 text-secondary w-full max-w-full sm:w-auto sm:min-w-md sm:max-w-2xl">
      <h3 className="text-primary pb-4 pt-2 ">You've Subscribed!</h3>
      {publication && (
        <PubListing
          className="p-0!"
          uri={publication.uri}
          record={publication.record}
          authorProfile={
            publication.author?.handle
              ? { handle: `@${publication.author.handle}` }
              : undefined
          }
        />
      )}
      <div className="spacer h-4 w-full" />
      {props.children}
      <RecommendedPublications
        publicationName={publicationName}
        recommendingPublicationUri={props.publicationUri}
        listings={listings}
      />
    </div>
  );
};
