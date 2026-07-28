import { Fragment } from "react";
import { AtUri } from "@atproto/syntax";
import { AppBskyFeedPost } from "@atproto/api";
import { Avatar } from "components/Avatar";
import { BskyEmbed } from "components/Blocks/BlueskyPostBlock/BskyEmbed";
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
// Clicking a post scopes the traffic chart to visits from that post.
export const BskyPostsList = (props: {
  posts: PublicationBskyPost[];
  isLoading: boolean;
  selectedRef: string | undefined;
  setSelectedRef: (ref: string | undefined) => void;
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
          <BskyPostRow
            row={row}
            selected={props.selectedRef === row.ref}
            onSelect={() =>
              props.setSelectedRef(
                props.selectedRef === row.ref ? undefined : row.ref,
              )
            }
          />
          <hr className="border-border-light last:hidden" />
        </Fragment>
      ))}
    </div>
  );
};

const BskyPostRow = (props: {
  row: PublicationBskyPost;
  selected: boolean;
  onSelect: () => void;
}) => {
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

  // Row-click toggles the traffic filter via an overlay button (the pattern
  // BskyPostContent uses): content is pointer-events-none so clicks fall
  // through to the overlay, with the embed and links opted back in.
  let rowClass = `relative flex justify-between gap-4 px-1 py-2 rounded-md ${
    props.selected ? "bg-[var(--accent-light)]" : ""
  }`;
  let overlay = (
    <button
      className="absolute inset-0"
      aria-label={
        props.selected
          ? "Clear Bluesky post filter"
          : "Filter traffic to this Bluesky post"
      }
      onClick={props.onSelect}
    />
  );

  if (!post) {
    return (
      <div className={`${rowClass} items-center text-sm`}>
        {overlay}
        <a
          className="pointer-events-auto relative text-tertiary italic hover:underline min-w-0 truncate"
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
    <div className={rowClass}>
      {overlay}
      <div className="flex gap-2 min-w-0 grow pointer-events-none">
        <div className="shrink-0 pointer-events-auto">
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
          {post.embed && (
            <div
              className="mt-1.5 pointer-events-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <BskyEmbed
                content={post.embed}
                postUrl={bskyUrl}
                compact
                className="text-sm"
              />
            </div>
          )}
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
              className="hover:text-accent-contrast pointer-events-auto relative"
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
