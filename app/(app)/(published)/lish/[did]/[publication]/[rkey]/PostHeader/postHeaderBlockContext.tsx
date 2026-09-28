"use client";
import { createContext, useContext } from "react";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { PostPageData } from "src/utils/getPostPageData";
import type { BylineProfile } from "src/utils/byline";

// What a post header block needs beyond DocumentContext: the resolved byline
// profiles and the header preferences, which only the page renderer holds.
export type PostHeaderBlockData = {
  data: PostPageData;
  profile?: ProfileViewDetailed;
  contributors?: BylineProfile[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  };
};

const PostHeaderBlockContext = createContext<PostHeaderBlockData | null>(null);

export const PostHeaderBlockProvider = PostHeaderBlockContext.Provider;

export function usePostHeaderBlockData() {
  return useContext(PostHeaderBlockContext);
}
