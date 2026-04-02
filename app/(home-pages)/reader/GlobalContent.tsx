"use client";
import { use } from "react";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { EmptyState } from "components/EmptyState";
import { PostListing } from "components/PostListing";
import type { Post } from "./getReaderFeed";
import {
  DesktopInteractionPreviewDrawer,
  MobileInteractionPreviewDrawer,
} from "./InteractionDrawers";
import { useSelectedPostListing } from "src/useSelectedPostState";

export const GlobalContent = (props: {
  promise: Promise<{ posts: Post[] }>;
}) => {
  const initialData = use(props.promise);

  const { data } = useSWR(
    "hot_feed",
    async () => {
      const res = await callRPC("get_hot_feed", {});
      return res as unknown as { posts: Post[] };
    },
    {
      fallbackData: { posts: initialData.posts },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const posts = data?.posts ?? [];

  let selectedPost = useSelectedPostListing((s) => s.selectedPostListing);

  if (posts.length === 0) {
    return <EmptyState title="Nothing trending right now. Check back soon!" />;
  }

  return (
    <div className="globalReader flex flex-row gap-6 w-full">
      <div className="globalPostListings flex flex-col gap-6 min-w-0 grow w-full">
        {posts.map((p) => (
          <PostListing
            {...p}
            key={p.documents.uri}
            selected={selectedPost?.document_uri === p.documents.uri}
          />
        ))}
      </div>
      <DesktopInteractionPreviewDrawer />
      <MobileInteractionPreviewDrawer />
    </div>
  );
};
