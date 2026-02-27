"use client";

import { use } from "react";
import type { Cursor, Post } from "./getReaderFeed";
import useSWRInfinite from "swr/infinite";
import { getNewFeed } from "./getNewFeed";
import { useEffect, useRef } from "react";
import { PostListing } from "components/PostListing";
import {
  DesktopInteractionPreviewDrawer,
  MobileInteractionPreviewDrawer,
} from "./InteractionDrawers";

export const NewContent = (props: {
  promise: Promise<{ posts: Post[]; nextCursor: Cursor | null }>;
}) => {
  const { posts, nextCursor } = use(props.promise);

  const getKey = (
    pageIndex: number,
    previousPageData: {
      posts: Post[];
      nextCursor: Cursor | null;
    } | null,
  ) => {
    if (previousPageData && !previousPageData.nextCursor) return null;
    if (pageIndex === 0) return ["new-feed", null] as const;
    return ["new-feed", previousPageData?.nextCursor] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, cursor]) => getNewFeed(cursor),
    {
      fallbackData: [{ posts, nextCursor }],
      revalidateFirstPage: false,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col gap-2 container bg-[rgba(var(--bg-page),.7)] sm:p-4 p-3 justify-between text-center text-tertiary">
        No posts yet. Check back soon!
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-6 w-full">
      <div className="flex flex-col gap-6 w-full relative">
        {allPosts.map((p) => (
          <PostListing {...p} key={p.documents.uri} />
        ))}
        <div
          ref={loadMoreRef}
          className="absolute bottom-96 left-0 w-full h-px pointer-events-none"
          aria-hidden="true"
        />
        {isValidating && allPosts.length > 0 && (
          <div className="text-center text-tertiary py-4">
            Loading more posts...
          </div>
        )}
      </div>
      <DesktopInteractionPreviewDrawer />
      <MobileInteractionPreviewDrawer />
    </div>
  );
};
