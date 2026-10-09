import {
  AppBskyEmbedImages,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
} from "@atproto/api";

export type BskyPostView = "full" | "media";

export function isBskyPostView(value: unknown): value is BskyPostView {
  return value === "full" || value === "media";
}

export type BskyPostMedia = Extract<
  NonNullable<AppBskyFeedDefs.PostView["embed"]>,
  AppBskyEmbedImages.View | AppBskyEmbedVideo.View
>;

// The post's images or video, unwrapped from a quote-with-media. Link cards
// and bare quotes aren't media, so those posts only have the full view.
export function getBskyPostMedia(
  post: AppBskyFeedDefs.PostView,
): BskyPostMedia | undefined {
  let embed = post.embed;
  if (AppBskyEmbedRecordWithMedia.isView(embed)) embed = embed.media;
  if (AppBskyEmbedImages.isView(embed) || AppBskyEmbedVideo.isView(embed))
    return embed;
  return undefined;
}

// A "media" view saved on a post that has no media falls back to the full post.
export function resolveBskyPostView(
  post: AppBskyFeedDefs.PostView,
  view: unknown,
): { view: "full" } | { view: "media"; media: BskyPostMedia } {
  if (view !== "media") return { view: "full" };
  let media = getBskyPostMedia(post);
  return media ? { view: "media", media } : { view: "full" };
}
