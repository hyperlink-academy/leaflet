import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { Separator } from "components/Layout";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { ThreadLink, QuotesLink } from "../PostLinks";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  BlueskyEmbed,
  PostNotAvailable,
} from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { openPage } from "../PostPages";
import { BskyPostContent } from "../BskyPostContent";

export const PubBlueskyPostBlock = (props: {
  post: PostView;
  className: string;
  pageId?: string;
}) => {
  let post = props.post;

  const handleOpenThread = () => {
    openPage(props.pageId ? { type: "doc", id: props.pageId } : undefined, {
      type: "thread",
      uri: post.uri,
    });
  };

  switch (true) {
    case AppBskyFeedDefs.isBlockedPost(post) ||
      AppBskyFeedDefs.isBlockedAuthor(post) ||
      AppBskyFeedDefs.isNotFoundPost(post):
      return (
        <div className={`w-full`}>
          <PostNotAvailable />
        </div>
      );

    case AppBskyFeedDefs.validatePostView(post).success:
      let record = post.record as AppBskyFeedDefs.PostView["record"];

      // silliness to get the text and timestamp from the record with proper types
      let timestamp: string | undefined = undefined;
      if (AppBskyFeedPost.isRecord(record)) {
        timestamp = (record as AppBskyFeedPost.Record).createdAt;
      }

      //getting the url to the post
      let postId = post.uri.split("/")[4];
      let postView = post as PostView;

      let url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;

      const parent = props.pageId
        ? { type: "doc" as const, id: props.pageId }
        : undefined;

      return (
        <BskyPostContent
          post={postView}
          parent={undefined}
          showBlueskyLink={true}
          showEmbed={true}
          avatarSize="large"
          quoteEnabled
          replyEnabled
          className="text-sm text-secondary block-border sm:px-3 sm:py-2 px-2 py-1 bg-bg-page mb-2 hover:border-accent-contrast!"
        />
      );
  }
};
