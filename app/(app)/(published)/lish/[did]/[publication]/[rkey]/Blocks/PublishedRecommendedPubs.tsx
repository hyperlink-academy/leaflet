"use client";
import { RecommendedPubsGrid } from "components/Subscribe/RecommendedPublications";
import { usePublicationRecommendationListings } from "components/Subscribe/useSubscribeSuccessData";

// Recommendations are resolved at render time rather than stored on the block,
// so the published post always shows the publication's current list. Readers
// get nothing while it loads or when there's nothing recommended — the
// "set up your recommendations" prompt is editor-only.
export const PublishedRecommendedPubs = (props: {
  publicationUri: string;
  compact?: boolean;
}) => {
  let { listings } = usePublicationRecommendationListings(props.publicationUri);
  if (listings.length === 0) return null;
  return (
    <RecommendedPubsGrid
      listings={listings}
      compact={props.compact}
      subscribeSource={{
        placement: "recommendation",
        publication: props.publicationUri,
      }}
    />
  );
};
