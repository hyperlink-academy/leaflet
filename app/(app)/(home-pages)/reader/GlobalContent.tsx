"use client";
import { use } from "react";
import useSWR from "swr";
import { EmptyState } from "components/EmptyState";
import { PostListing } from "components/PostListing";
import type { Post } from "./getReaderFeed";
import { useSelectedPostListing } from "src/useSelectedPostState";

export const GlobalContent = (props: {
  promise: Promise<{ posts: Post[] }>;
}) => {
  const initialData = use(props.promise);

  const { data } = useSWR(
    "hot_feed",
    async () => {
      // GET so the response comes from the CDN — the feed is identical for
      // everyone and already 5-min stale server-side.
      const res = await fetch("/api/hot_feed");
      return (await res.json()) as { posts: Post[] };
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
    return (
      <EmptyState title="Hmmm… Something went wrong.">
        Try refreshing your browser. If the problem persists,{" "}
        <a href="mailto:contact@leaflet.pub">email us</a>.
      </EmptyState>
    );
  }
  
  return (
    <>
      {posts.map((p) => (
        <PostListing
          {...p}
          key={p.documents.uri}
          selected={selectedPost?.document_uri === p.documents.uri}
        />
      ))}
    </>
  );
};
