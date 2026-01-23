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
      let url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;

      const parent = props.pageId
        ? { type: "doc" as const, id: props.pageId }
        : undefined;

      return (
        <div
          onClick={handleOpenThread}
          className={`
            ${props.className}
            block-border
            mb-2
      flex flex-col gap-2 relative w-full overflow-hidden group/blueskyPostBlock sm:p-3 p-2 text-sm text-secondary bg-bg-page
      cursor-pointer hover:border-accent-contrast
      `}
        >
          {post.author && record && (
            <>
              <div className="bskyAuthor w-full flex items-center gap-2">
                {post.author.avatar && (
                  <img
                    src={post.author?.avatar}
                    alt={`${post.author?.displayName}'s avatar`}
                    className="shink-0 w-8 h-8 rounded-full border border-border-light"
                  />
                )}
                <div className="grow flex flex-col gap-0.5 leading-tight">
                  <div className=" font-bold text-secondary">
                    {post.author?.displayName}
                  </div>
                  <a
                    className="text-xs text-tertiary hover:underline"
                    target="_blank"
                    href={`https://bsky.app/profile/${post.author?.handle}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{post.author?.handle}
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 ">
                <div>
                  <pre className="whitespace-pre-wrap">
                    {BlueskyRichText({
                      record: record as AppBskyFeedPost.Record | null,
                    })}
                  </pre>
                </div>
                {post.embed && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <BlueskyEmbed embed={post.embed} postUrl={url} />
                  </div>
                )}
              </div>
            </>
          )}
          <div className="w-full flex gap-2 items-center justify-between">
            <ClientDate date={timestamp} />
            <div className="flex gap-2 items-center">
              {post.replyCount != null && post.replyCount > 0 && (
                <>
                  <ThreadLink
                    postUri={post.uri}
                    parent={parent}
                    className="flex items-center gap-1 hover:text-accent-contrast"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.replyCount}
                    <CommentTiny />
                  </ThreadLink>
                  <Separator classname="h-4" />
                </>
              )}
              {post.quoteCount != null && post.quoteCount > 0 && (
                <>
                  <QuotesLink
                    postUri={post.uri}
                    parent={parent}
                    className="flex items-center gap-1 hover:text-accent-contrast"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.quoteCount}
                    <QuoteTiny />
                  </QuotesLink>
                  <Separator classname="h-4" />
                </>
              )}

              <a
                className=""
                target="_blank"
                href={url}
                onClick={(e) => e.stopPropagation()}
              >
                <BlueskyTiny />
              </a>
            </div>
          </div>
        </div>
      );
  }
};

const ClientDate = (props: { date?: string }) => {
  let pageLoaded = useHasPageLoaded();
  const formattedDate = useLocalizedDate(
    props.date || new Date().toISOString(),
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    },
  );

  if (!pageLoaded) return null;

  return <div className="text-xs text-tertiary">{formattedDate}</div>;
};
