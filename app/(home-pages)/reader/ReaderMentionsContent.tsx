"use client";
import useSWR from "swr";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { BskyPostContent } from "app/lish/[did]/[publication]/[rkey]/BskyPostContent";
import { DotLoader } from "components/utils/DotLoader";

async function fetchBskyPosts(uris: string[]): Promise<PostView[]> {
  const params = new URLSearchParams({
    uris: JSON.stringify(uris),
  });
  const response = await fetch(`/api/bsky/hydrate?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch Bluesky posts");
  return response.json();
}

export function ReaderMentionsContent(props: {
  quotesAndMentions: { uri: string; link?: string }[];
}) {
  const uris = props.quotesAndMentions.map((q) => q.uri);
  const key = uris.length > 0
    ? `/api/bsky/hydrate?${new URLSearchParams({ uris: JSON.stringify(uris) }).toString()}`
    : null;

  const { data: bskyPosts, isLoading } = useSWR(key, () =>
    fetchBskyPosts(uris),
  );

  if (props.quotesAndMentions.length === 0) {
    return (
      <div className="opaque-container flex flex-col gap-0.5 p-[6px] text-tertiary italic text-sm text-center">
        <div className="font-bold">no mentions yet!</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm mt-8">
        <span>loading</span>
        <DotLoader />
      </div>
    );
  }

  const postViewMap = new Map<string, PostView>();
  bskyPosts?.forEach((pv) => postViewMap.set(pv.uri, pv));

  return (
    <div className="flex flex-col gap-4 w-full">
      {props.quotesAndMentions.map((q, index) => {
        const post = postViewMap.get(q.uri);
        if (!post) return null;
        return (
          <div key={q.uri}>
            <BskyPostContent
              post={post}
              parent={undefined}
              showBlueskyLink={true}
              showEmbed={true}
              avatarSize="medium"
              className="text-sm"
              compactEmbed
            />
            {index < props.quotesAndMentions.length - 1 && (
              <hr className="border-border-light mt-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}
