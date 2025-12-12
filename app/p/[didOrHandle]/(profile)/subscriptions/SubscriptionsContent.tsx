"use client";

import { useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { PubListing } from "app/(home-pages)/discover/PubListing";
import {
  getSubscriptions,
  type PublicationSubscription,
} from "app/(home-pages)/reader/getSubscriptions";
import { Cursor } from "app/(home-pages)/reader/getReaderFeed";

export const ProfileSubscriptionsContent = (props: {
  did: string;
  subscriptions: PublicationSubscription[];
  nextCursor: Cursor | null;
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

  const allSubscriptions = data
    ? data.flatMap((page) => page.subscriptions)
    : [];

  if (allSubscriptions.length === 0 && !isValidating) {
    return (
      <div className="text-tertiary text-center py-4">No subscriptions yet</div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {allSubscriptions.map((sub) => (
          <PubListing key={sub.uri} {...sub} />
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
