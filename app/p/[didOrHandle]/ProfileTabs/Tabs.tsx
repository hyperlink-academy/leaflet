import { Tab } from "components/Tab";
import { profileTabsType } from "../ProfilePageLayout";
import { PostListing } from "components/PostListing";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";
import type { Cursor } from "../getProfilePosts";
import { getProfilePosts } from "../getProfilePosts";
import useSWRInfinite from "swr/infinite";
import { useEffect, useRef } from "react";

export const ProfileTabs = (props: {
  tab: profileTabsType;
  setTab: (t: profileTabsType) => void;
}) => {
  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <Tab
            name="Posts"
            selected={props.tab === "posts"}
            onSelect={() => {
              props.setTab("posts");
            }}
          />
          <Tab
            name="Comments"
            selected={props.tab === "comments"}
            onSelect={() => {
              props.setTab("comments");
            }}
          />
        </div>
        <Tab
          name="Subscriptions"
          selected={props.tab === "subscriptions"}
          onSelect={() => {
            props.setTab("subscriptions");
          }}
        />
      </div>
      <hr className="border-border-light mb-2 mt-1" />
    </div>
  );
};

export const TabContent = (props: {
  tab: profileTabsType;
  did: string;
  posts: Post[];
  nextCursor: Cursor | null;
}) => {
  switch (props.tab) {
    case "posts":
      return (
        <ProfilePostsContent
          did={props.did}
          posts={props.posts}
          nextCursor={props.nextCursor}
        />
      );
    case "comments":
      return <div>comments here!</div>;
    case "subscriptions":
      return <div>subscriptions here!</div>;
  }
};

const ProfilePostsContent = (props: {
  did: string;
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
    if (pageIndex === 0) return ["profile-posts", props.did, null] as const;

    // Add the cursor to the key
    return ["profile-posts", props.did, previousPageData?.nextCursor] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, did, cursor]) => getProfilePosts(did, cursor),
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

  if (allPosts.length === 0 && !isValidating) {
    return <div className="text-tertiary text-center py-4">No posts yet</div>;
  }

  return (
    <div className="flex flex-col gap-2 text-left relative">
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
    </div>
  );
};
