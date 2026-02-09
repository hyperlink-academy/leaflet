"use client";
import { ButtonPrimary } from "components/Buttons";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import type { Cursor, Post } from "./getReaderFeed";
import useSWRInfinite from "swr/infinite";
import { getReaderFeed } from "./getReaderFeed";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PostListing } from "components/PostListing";
import { SortSmall } from "components/Icons/SortSmall";
import { Input } from "components/Input";
import { useHasBackgroundImage } from "components/Pages/useHasBackgroundImage";
import {
  SelectedPostListing,
  useSelectedPostListing,
} from "src/useSelectedPostState";
import { AtUri } from "@atproto/api";
import { MentionsDrawerContent } from "app/lish/[did]/[publication]/[rkey]/Interactions/Quotes";
import { CommentsDrawerContent } from "app/lish/[did]/[publication]/[rkey]/Interactions/Comments";
import { CloseTiny } from "components/Icons/CloseTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { GoToArrow } from "components/Icons/GoToArrow";

export const InboxContent = (props: {
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
  let [searchValue, setSearchValue] = useState("");
  let [sort, setSort] = useState<"recent" | "popular">("popular");

  const allPosts = data ? data.flatMap((page) => page.posts) : [];
  const postTitles = allPosts.map((p) => {
    p.documents.data?.title;
  });
  const filteredPosts = allPosts
    .filter((p) =>
      p.documents.data?.title.toLowerCase().includes(searchValue.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.documents.data?.publishedAt || 0).getTime() -
        new Date(a.documents.data?.publishedAt || 0).getTime(),
    );

  if (allPosts.length === 0 && !isValidating) return <ReaderEmpty />;

  let hasBackgroundImage = useHasBackgroundImage();

  return (
    <div className="flex flex-row gap-6 ">
      <div className="flex flex-col gap-6 relative">
        <div className="flex justify-between gap-4 text-tertiary">
          <Input
            className={`inboxSearchInput
            appearance-none! outline-hidden!
            w-full min-w-0 text-primary relative px-1
            border rounded-md border-border-light focus-within:border-border
            bg-transparent ${hasBackgroundImage ? "focus-within:bg-bg-page" : "focus-within:bg-bg-leaflet"} `}
            type="text"
            id="inbox-search"
            size={1}
            placeholder="search posts..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.currentTarget.value);
            }}
          />
          <button
            className="flex gap-1"
            onClick={() => {
              setSort(sort === "popular" ? "recent" : "popular");
            }}
          >
            {sort === "popular" ? "Popular" : "Recent"}
            <SortSmall />
          </button>
        </div>
        {filteredPosts.map((p) => (
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
      <DesktopInteractionPreviewDrawer />
      <MobileInteractionPreviewDrawer />
    </div>
  );
};

const MobileInteractionPreviewDrawer = () => {
  let selectedPost = useSelectedPostListing((s) => s.selectedPostListing);

  return (
    <div
      className={`z-20 fixed bottom-0 left-0 right-0 border border-border-light shrink-0 w-screen h-[90vh] px-3 bg-bg-leaflet rounded-t-lg overflow-auto ${selectedPost === null ? "hidden" : "block md:hidden "}`}
    >
      <PreviewDrawerContent selectedPost={selectedPost} />
    </div>
  );
};
const DesktopInteractionPreviewDrawer = () => {
  let selectedPost = useSelectedPostListing((s) => s.selectedPostListing);

  return (
    <div
      className={`hidden md:block border border-border-light shrink-0 w-96 mr-2 px-3  h-[calc(100vh-100px)] sticky top-11 bottom-4 right-0 rounded-lg overflow-auto ${selectedPost === null ? "shadow-none border-dashed bg-transparent" : "shadow-md border-border bg-bg-page "}`}
    >
      <PreviewDrawerContent selectedPost={selectedPost} />
    </div>
  );
};

const PreviewDrawerContent = (props: {
  selectedPost: SelectedPostListing | null;
}) => {
  if (!props.selectedPost || !props.selectedPost.document) return;

  if (props.selectedPost.drawer === "quotes") {
    return (
      <>
        {/*<MentionsDrawerContent
            did={selectedPost.document_uri}
            quotesAndMentions={[]}
          />*/}
      </>
    );
  } else
    return (
      <>
        <div className="w-full  text-sm text-tertiary flex justify-between pt-3 gap-3">
          <div className="truncate min-w-0 grow">
            Comments for {props.selectedPost.document.title}
          </div>
          <button
            className="text-tertiary"
            onClick={() =>
              useSelectedPostListing.getState().setSelectedPostListing(null)
            }
          >
            <CloseTiny />
          </button>
        </div>
        <SpeedyLink
          className="shrink-0 flex gap-1 items-center "
          href={"/"}
        ></SpeedyLink>
        <ButtonPrimary fullWidth compact className="text-sm! mt-1">
          See Full Post <GoToArrow />
        </ButtonPrimary>
        <CommentsDrawerContent
          noCommentBox
          document_uri={props.selectedPost.document_uri}
          comments={[]}
        />
      </>
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
