"use client";
import { use } from "react";
import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";
import { PostListing } from "components/PostListing";
import type { Post } from "./getReaderFeed";
import {
  DesktopInteractionPreviewDrawer,
  MobileInteractionPreviewDrawer,
} from "./InteractionDrawers";

export const GlobalContent = (props: {
  promise: Promise<{ posts: Post[] }>;
}) => {
  const initialData = use(props.promise);

  const { data, isLoading } = useSWR(
    "hot_feed",
    async () => {
      const res = await callRPC("get_hot_feed", {});
      return res as unknown as { posts: Post[] };
    },
    {
      fallbackData: { posts: initialData.posts },
    },
  );

  const posts = data?.posts ?? [];

  if (isLoading) {
    return (
      <div className="text-center text-tertiary py-8">Loading posts...</div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col gap-2 container bg-[rgba(var(--bg-page),.7)] sm:p-4 p-3 justify-between text-center text-tertiary">
        Nothing trending right now. Check back soon!
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-6 w-full">
      <div className="flex flex-col gap-8 w-full">
        {posts.map((p) => (
          <PostListing {...p} key={p.documents.uri} />
        ))}
      </div>
      <DesktopInteractionPreviewDrawer />
      <MobileInteractionPreviewDrawer />
    </div>
  );
};
