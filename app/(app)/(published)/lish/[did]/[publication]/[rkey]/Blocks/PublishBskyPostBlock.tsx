import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import { PostNotAvailable } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BskyPostContent, BskyPostMediaContent } from "../BskyPostContent";
import { resolveBskyPostView } from "src/utils/bskyPostView";

export const PubBlueskyPostBlock = (props: {
  post: PostView;
  className: string;
  pageId?: string;
  clientHost?: string;
  view?: string;
}) => {
  let post = props.post;

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
      let postView = post as PostView;
      let resolved = resolveBskyPostView(postView, props.view);
      let cardClassName =
        "publishedBskyPostBlock text-sm text-secondary block-border sm:px-3 sm:py-2 px-2 py-1 bg-bg-page mb-2 hover:border-accent-contrast!";

      if (resolved.view === "media")
        return (
          <BskyPostMediaContent
            post={postView}
            media={resolved.media}
            parent={undefined}
            quoteEnabled
            replyEnabled
            className={cardClassName}
            clientHost={props.clientHost}
          />
        );

      return (
        <BskyPostContent
          post={postView}
          parent={undefined}
          showBlueskyLink={true}
          showEmbed={true}
          avatarSize="large"
          quoteEnabled
          replyEnabled
          className={cardClassName}
          clientHost={props.clientHost}
        />
      );
  }
};
