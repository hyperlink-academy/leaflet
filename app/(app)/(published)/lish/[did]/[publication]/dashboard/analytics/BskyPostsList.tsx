import { Fragment, useMemo } from "react";
import { AtUri } from "@atproto/syntax";
import {
  AppBskyEmbedExternal,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";
import { Avatar } from "components/Avatar";
import { BlueskyRichText } from "components/Blocks/BlueskyPostBlock/BlueskyRichText";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { RecommendEmptyTiny } from "components/Icons/RecommendTiny";
import { PostInfo } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/BskyPostContent";
import type { PublicationBskyPost } from "app/api/rpc/[command]/get_publication_bsky_posts";
import { usePublicationData } from "../PublicationSWRProvider";
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
  let { data } = usePublicationData();
  // Same path → document mapping TopPages uses, to name the post a Bluesky
  // post's link points at.
  let docsByPath = useMemo(() => {
    let map = new Map<string, { title: string }>();
    for (let doc of data?.documents || []) {
      let path = doc.record.path || "";
      map.set(path.startsWith("/") ? path : `/${path}`, {
        title: doc.record.title,
      });
    }
    return map;
  }, [data?.documents]);

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
            docsByPath={docsByPath}
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
  docsByPath: Map<string, { title: string }>;
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
  // through to the overlay, with the links opted back in.
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
  let referenced = referencedPost(post.embed, props.docsByPath);
  return (
    <div className={rowClass}>
      {overlay}
      <div className="flex gap-2 min-w-0 grow pointer-events-none">
        <div className="shrink-0 pointer-events-auto">
          <Avatar
            src={post.author.avatar}
            displayName={post.author.displayName || post.author.handle}
            size="tiny"
          />
        </div>
        <div className="flex flex-col min-w-0 grow">
          <PostInfo
            displayName={post.author.displayName}
            handle={post.author.handle}
            createdAt={record.createdAt}
            compact
          />
          <div className="text-secondary text-xs mt-0.5 line-clamp-2">
            <BlueskyRichText record={record} />
          </div>
          {referenced && (
            <a
              className="pointer-events-auto relative flex items-center gap-1 text-xs text-tertiary mt-1 min-w-0 w-fit max-w-full hover:text-accent-contrast"
              href={referenced.url}
              target="_blank"
              rel="noreferrer"
            >
              {referenced.isQuote ? (
                <QuoteTiny className="shrink-0" />
              ) : (
                <ArrowRightTiny className="shrink-0" />
              )}
              <span className="truncate">
                {referenced.isQuote
                  ? `Quotes “${referenced.title}”`
                  : referenced.title}
              </span>
            </a>
          )}
          <div className="flex gap-3 items-center text-tertiary text-xs mt-1">
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

// Which publication post the Bluesky post's link card points at, resolved by
// path against this publication's documents, and whether the link is a quote
// share (an /l-quote/ url). `url` is the link stripped of its utm params so
// visiting it from the dashboard doesn't count as Bluesky-referred traffic.
function referencedPost(
  embed: AppBskyFeedDefs.PostView["embed"],
  docsByPath: Map<string, { title: string }>,
): { title: string; url: string; isQuote: boolean } | null {
  let external: AppBskyEmbedExternal.ViewExternal | undefined;
  if (AppBskyEmbedExternal.isView(embed)) external = embed.external;
  else if (
    AppBskyEmbedRecordWithMedia.isView(embed) &&
    AppBskyEmbedExternal.isView(embed.media)
  )
    external = embed.media.external;
  if (!external) return null;

  try {
    let url = new URL(external.uri);
    let isQuote = url.pathname.includes("/l-quote/");
    let basePath = url.pathname.split("/l-quote/")[0];
    let doc = docsByPath.get(basePath);
    url.search = "";
    return {
      title: doc?.title || external.title || basePath,
      url: url.toString(),
      isQuote,
    };
  } catch {
    return null;
  }
}
