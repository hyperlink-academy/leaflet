"use client";
import { ButtonPrimary } from "components/Buttons";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import type { Cursor, Post } from "./getReaderFeed";
import useSWRInfinite from "swr/infinite";
import { getReaderFeed } from "./getReaderFeed";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { PostListing } from "components/PostListing";

export const ReaderContent = (props: {
  posts: Post[];
  nextCursor: Cursor | null;
}) => {
  const getKey = (
    pageIndex: number,
    previousPageData: {
      posts: Post[];
      nextCursor: Cursor | null;
    } | null,
  ) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // First page, we don't have previousPageData
    if (pageIndex === 0) return ["reader-feed", null] as const;

    // Add the cursor to the key
    return ["reader-feed", previousPageData?.nextCursor] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, cursor]) => getReaderFeed(cursor),
    {
      fallbackData: [{ posts: props.posts, nextCursor: props.nextCursor }],
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

  const allPosts = data ? data.flatMap((page) => page.posts) : [];

  if (allPosts.length === 0 && !isValidating) return <ReaderEmpty />;

  return (
    <div className="flex flex-col gap-3 relative">
      {allPosts.map((p) => (
        <PostListing {...p} key={p.documents.uri} />
      ))}
      {/* Trigger element for loading more posts */}
      <div
        ref={loadMoreRef}
        className="absolute bottom-96 left-0 w-full h-px pointer-events-none"
        aria-hidden="true"
      />
      {isValidating && (
        <div className="text-center text-tertiary py-4">
          Loading more posts...
        </div>
      )}
    </div>
  );
};

export const ReaderEmpty = () => {
  return (
    <div className="flex flex-col gap-2 container bg-[rgba(var(--bg-page),.7)] sm:p-4 p-3 justify-between text-center text-tertiary">
      Nothing to read yet… <br />
      Subscribe to publications and find their posts here!
      <Link href={"/discover"}>
        <ButtonPrimary className="mx-auto place-self-center">
          <DiscoverSmall /> Discover Publications
        </ButtonPrimary>
      </Link>
    </div>
  );
};
