import { Fragment } from "react";
import { AtUri } from "@atproto/syntax";
import { AppBskyFeedPost } from "@atproto/api";
import { Avatar } from "components/Avatar";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { RecommendEmptyTiny } from "components/Icons/RecommendTiny";
import { PostInfo } from "app/(app)/lish/[did]/[publication]/[rkey]/BskyPostContent";
import type { PublicationBskyPost } from "app/api/rpc/[command]/get_publication_bsky_posts";
import { ListSkeleton } from "./Skeletons";

// The Bluesky posts (created via publish/share/quote flows) that have driven
// traffic to this publication, with each post's content and interactions.
export const BskyPostsList = (props: {
  posts: PublicationBskyPost[];
  isLoading: boolean;
}) => {
  if (props.isLoading) return <ListSkeleton />;
  if (props.posts.length === 0)
    return (
      <div className="text-tertiary text-sm pt-1">
        No traffic from Bluesky posts yet — links shared to Bluesky will show up
        here.
      </div>
    );
  return (
    <div className="flex flex-col pt-1">
      {props.posts.map((row) => (
        <Fragment key={row.uri}>
          <BskyPostRow row={row} />
          <hr className="border-border-light last:hidden" />
        </Fragment>
      ))}
    </div>
  );
};

const BskyPostRow = (props: { row: PublicationBskyPost }) => {
  let { post, pageviews, visitors, uri } = props.row;
  let atUri = new AtUri(uri);
  let bskyUrl = `https://bsky.app/profile/${post?.author.handle ?? atUri.host}/post/${atUri.rkey}`;

  let metrics = (
    <div className="shrink-0 flex flex-col items-end tabular-nums text-sm">
      <div className="font-bold text-secondary">
        {pageviews.toLocaleString()}
        <span className="font-normal text-tertiary"> views</span>
      </div>
      <div className="text-tertiary text-xs">
        {visitors.toLocaleString()} visitors
      </div>
    </div>
  );

  if (!post) {
    return (
      <div className="flex justify-between gap-4 px-1 py-2 items-center text-sm">
        <a
          className="text-tertiary italic hover:underline min-w-0 truncate"
          href={bskyUrl}
          target="_blank"
          rel="noreferrer"
        >
          Post unavailable — it may have been deleted
        </a>
        {metrics}
      </div>
    );
  }

  let record = post.record as AppBskyFeedPost.Record;
  return (
    <div className="flex justify-between gap-4 px-1 py-2">
      <div className="flex gap-2 min-w-0 grow">
        <div className="shrink-0">
          <Avatar
            src={post.author.avatar}
            displayName={post.author.displayName || post.author.handle}
            size="small"
          />
        </div>
        <div className="flex flex-col min-w-0 grow">
          <PostInfo
            displayName={post.author.displayName}
            handle={post.author.handle}
            createdAt={record.createdAt}
            compact
          />
          <div className="text-secondary text-sm mt-0.5">
            <BlueskyRichText record={record} />
          </div>
          <div className="flex gap-3 items-center text-tertiary text-xs mt-1.5">
            {(post.likeCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <RecommendEmptyTiny />
                {post.likeCount}
              </div>
            )}
            {(post.replyCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <CommentTiny />
                {post.replyCount}
              </div>
            )}
            {(post.quoteCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <QuoteTiny />
                {post.quoteCount}
              </div>
            )}
            <a
              className="hover:text-accent-contrast"
              href={bskyUrl}
              target="_blank"
              rel="noreferrer"
            >
              <BlueskyLinkTiny />
            </a>
          </div>
        </div>
      </div>
      {metrics}
    </div>
  );
};
