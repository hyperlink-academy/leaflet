"use client";
import { use } from "react";
import { ButtonPrimary } from "components/Buttons";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import type { Cursor, Post } from "./getReaderFeed";
import useSWRInfinite from "swr/infinite";
import { getReaderFeed } from "./getReaderFeed";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { PostListing } from "components/PostListing";
import { useSelectedPostListing } from "src/useSelectedPostState";
import { useIdentityData } from "components/IdentityProvider";
import { LoginContent } from "components/LoginButton";
import { EmptyState } from "components/EmptyState";

export const InboxContent = (props: {
  promise: Promise<{ posts: Post[]; nextCursor: Cursor | null }>;
}) => {
  const { posts, nextCursor } = use(props.promise);
  let { identity: identityData } = useIdentityData();
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
      fallbackData: [{ posts, nextCursor }],
      revalidateFirstPage: false,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  let selectedPost = useSelectedPostListing((s) => s.selectedPostListing);

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

  const sortedPosts = allPosts.sort(
    (a, b) =>
      new Date(b.documents.data?.publishedAt || 0).getTime() -
      new Date(a.documents.data?.publishedAt || 0).getTime(),
  );

  if (!identityData) {
    return (
      <EmptyState container="frosted" title="Log in or sign up">
        <LoginContent className="w-full! sm:min-w-xs" />
      </EmptyState>
    );
  }

  if (allPosts.length === 0) return <ReaderEmpty />;

  return (
    <>
      {sortedPosts.map((p) => (
        <PostListing
          {...p}
          key={p.documents.uri}
          selected={selectedPost?.document_uri === p.documents.uri}
        />
      ))}
      {/* Trigger element for loading more posts */}
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
    </>
  );
};

const ReaderEmpty = () => {
  return (
    <EmptyState container="frosted" title="Nothing to read yet…">
      Subscribe to publications and find their latest posts here!
      <Link href={"/reader/trending"}>
        <ButtonPrimary className="mx-auto place-self-center">
          <DiscoverSmall /> See what posts people are reading!
        </ButtonPrimary>
      </Link>
    </EmptyState>
  );
};
