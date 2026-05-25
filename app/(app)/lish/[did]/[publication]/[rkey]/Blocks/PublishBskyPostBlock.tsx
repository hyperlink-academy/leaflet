import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { AppBskyFeedDefs } from "@atproto/api";
import { PostNotAvailable } from "components/Blocks/BlueskyPostBlock/BlueskyEmbed";
import { BskyPostContent } from "../BskyPostContent";

export const PubBlueskyPostBlock = (props: {
  post: PostView;
  className: string;
  pageId?: string;
  clientHost?: string;
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
          clientHost={props.clientHost}
        />
      );
  }
};
