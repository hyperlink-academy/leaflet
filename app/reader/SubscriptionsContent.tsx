"use client";
import { PubListing } from "app/discover/PubListing";
import { ButtonPrimary } from "components/Buttons";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { Json } from "supabase/database.types";
import { PublicationSubscription, getSubscriptions } from "./getSubscriptions";
import useSWRInfinite from "swr/infinite";
import { useEffect, useRef } from "react";
import { Cursor } from "./getReaderFeed";

export const SubscriptionsContent = (props: {
  publications: PublicationSubscription[];
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
    if (pageIndex === 0) return ["subscriptions", null] as const;

    // Add the cursor to the key
    return ["subscriptions", previousPageData?.nextCursor] as const;
  };

  const { data, error, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, cursor]) => getSubscriptions(cursor),
    {
      fallbackData: [
        { subscriptions: props.publications, nextCursor: props.nextCursor },
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

  const allPublications = data
    ? data.flatMap((page) => page.subscriptions)
    : [];

  if (allPublications.length === 0 && !isValidating)
    return <SubscriptionsEmpty />;

  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {allPublications?.map((p, index) => <PubListing key={p.uri} {...p} />)}
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

const SubscriptionsEmpty = () => {
  return (
    <div className="flex flex-col gap-2 container bg-[rgba(var(--bg-page),.7)] sm:p-4 p-3 justify-between text-center font-bold text-tertiary">
      You haven't subscribed to any publications yet!
      <ButtonPrimary className="mx-auto place-self-center">
        <DiscoverSmall /> Discover Publications
      </ButtonPrimary>
    </div>
  );
};
