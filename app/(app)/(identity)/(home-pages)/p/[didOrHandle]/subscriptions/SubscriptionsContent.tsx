"use client";

import { EmptyState } from "components/EmptyState";
import { useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import {
  getSubscriptions,
  type PublicationSubscription,
} from "actions/reader/getSubscriptions";
import { Cursor } from "actions/reader/getReaderFeed";

export const ProfileSubscriptionsContent = (props: {
  did: string;
  subscriptions: PublicationSubscription[];
  nextCursor: Cursor | null;
  // Extra subscriptions merged ahead of the paginated atproto list — the
  // viewer's own email-only subscriptions on the "Your Subscriptions" page.
  // The public profile page never passes these.
  prependSubscriptions?: PublicationSubscription[];
  excludeUris?: string[];
}) => {
  const getKey = (
    pageIndex: number,
    previousPageData: {
      subscriptions: PublicationSubscription[];
      nextCursor: Cursor | null;
    } | null,
  ) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // First page, we don't have previousPageData
    if (pageIndex === 0)
      return ["profile-subscriptions", props.did, null] as const;

    // Add the cursor to the key
    return [
      "profile-subscriptions",
      props.did,
      previousPageData?.nextCursor,
    ] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, did, cursor]) => getSubscriptions(did, cursor),
    {
      fallbackData: [
        { subscriptions: props.subscriptions, nextCursor: props.nextCursor },
      ],
      revalidateFirstPage: false,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer to load more when trigger element is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating) {
          const hasMore = data && data[data.length - 1]?.nextCursor;
          if (hasMore) {
            setSize(size + 1);
          }
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [data, size, setSize, isValidating]);

  const seenUris = new Set<string>();
  const subscriptions = [
    ...(props.prependSubscriptions ?? []),
    ...(data ? data.flatMap((page) => page.subscriptions) : []),
  ].filter((sub) => {
    if (props.excludeUris?.includes(sub.uri) || seenUris.has(sub.uri))
      return false;
    seenUris.add(sub.uri);
    return true;
  });

  if (subscriptions.length === 0 && !isValidating) {
    return <EmptyState title="No subscriptions yet" />;
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subscriptions.map((sub) => (
          <PubListing
            constrainHeight
            showSubscribeButton
            subscribeSource={{ placement: "profile" }}
            key={sub.uri}
            {...sub}
          />
        ))}
      </div>
      {/* Trigger element for loading more subscriptions */}
      <div
        ref={loadMoreRef}
        className="absolute bottom-96 left-0 w-full h-px pointer-events-none"
        aria-hidden="true"
      />
      {isValidating && (
        <div className="text-center text-tertiary py-4">
          Loading more subscriptions...
        </div>
      )}
    </div>
  );
};
