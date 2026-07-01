"use client";

import { PostListing } from "components/PostListing";
import type { Post } from "app/(app)/(home-pages)/reader/getReaderFeed";
import { getDocumentsByTag, type Cursor } from "./getDocumentsByTag";
import useSWRInfinite from "swr/infinite";
import { useEffect, useRef } from "react";

export const TagContent = (props: {
  tag: string;
  posts: Post[];
  nextCursor: Cursor | null;
}) => {
  const getKey = (
    pageIndex: number,
    previousPageData: { posts: Post[]; nextCursor: Cursor | null } | null,
  ) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // First page, we don't have previousPageData
    if (pageIndex === 0) return ["tag-posts", props.tag, null] as const;

    // Add the cursor to the key
    return ["tag-posts", props.tag, previousPageData?.nextCursor] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, tag, cursor]) => getDocumentsByTag(tag, cursor),
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
  const hasMore = !!data?.[data.length - 1]?.nextCursor;

  return (
    <div className="max-w-prose w-full grow shrink-0">
      <h1 className="sm:text-xl text-lg">Tag: {props.tag}</h1>

      <div className="pt-4 flex flex-col gap-4 relative">
        {allPosts.length === 0 && !isValidating ? (
          <NoPostsForTag tag={props.tag} />
        ) : (
          <>
            <div className="text-tertiary text-sm px-3">
              {allPosts.length}
              {hasMore ? "+" : ""}{" "}
              {allPosts.length === 1 ? "post" : "posts"}
            </div>
            {allPosts.map((post) => (
              <PostListing key={post.documents.uri} {...post} />
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
          </>
        )}
      </div>
    </div>
  );
};

const NoPostsForTag = (props: { tag: string }) => {
  return (
    <div className="flex flex-col gap-2 items-center justify-center p-8 text-center">
      <div className="text-tertiary">
        No posts found with the tag "{props.tag}"
      </div>
    </div>
  );
};
