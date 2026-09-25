"use client";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { Interactions, getQuoteCount } from "../Interactions/Interactions";
import { usePostFrame } from "../postFrame";
import {
  type DrawerThread,
  DrawerThreadContext,
} from "../Interactions/drawerThreadContext";
import { PostPageData } from "src/utils/getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { usePostEditLink } from "../usePostEditLink";
import { EditTiny } from "components/Icons/EditTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { Separator } from "components/Layout";
import { ProfilePopover } from "components/ProfilePopover";
import { Fragment, useMemo } from "react";
import {
  type BylineProfile,
  bylineName,
  bylineSeparator,
} from "src/utils/byline";
import { TagPopover } from "components/Interactions/InteractionsPreview";

// Re-export so existing importers of `BylineProfile` from this module keep
// working. The serializable byline profile (subset of the profile cache shape)
// is passed from the server data builder. When present and non-empty it
// represents the document's contributors; otherwise the single-author
// `profile` is used.
export type { BylineProfile };

export function PostHeader(props: {
  data: PostPageData;
  profile?: ProfileViewDetailed;
  contributors?: BylineProfile[];
  preferences: {
    showComments?: boolean;
    showMentions?: boolean;
    showRecommends?: boolean;
  };
  isCanvas?: boolean;
  compact?: boolean;
}) {
  let document = props.data;

  const record = document?.normalizedDocument;
  let profile = props.profile;
  let pub = props.data?.documents_in_publications[0]?.publications;
  let editLink = usePostEditLink(document?.uri, pub?.identity_did);
  let { headerInteractions } = usePostFrame();

  if (!document?.data || !record) return null;
  return (
    <PostHeaderLayout
      compact={props.compact}
      pubLink={
        <>
          {pub && (
            <SpeedyLink
              className="font-bold no-underline! text-accent-contrast"
              href={document && getPublicationURL(pub)}
            >
              {pub?.name}
            </SpeedyLink>
          )}
          {editLink && (
            // Out of flow, in the header's own padding: identity only
            // resolves after first paint on a published page, and in flow this
            // takes width off the pub name — enough to wrap it and push the
            // title and byline down.
            <a
              className="absolute -right-3 sm:-right-4 top-0 bottom-0 rounded-full flex place-items-center"
              href={editLink}
            >
              <EditTiny className="shrink-0" />
            </a>
          )}
        </>
      }
      postTitle={record.title}
      postDescription={props.compact ? undefined : record.description}
      postInfo={
        <>
          <PostByline
            record={record}
            profile={profile}
            contributors={props.contributors}
            hideTags={!headerInteractions}
          />
          {!props.isCanvas && headerInteractions && (
            <Interactions
              className="sm:mt-0 mt-1"
              showComments={props.preferences.showComments !== false}
              showMentions={props.preferences.showMentions !== false}
              showRecommends={props.preferences.showRecommends !== false}
              quotesCount={
                getQuoteCount(document?.quotesAndMentions || []) || 0
              }
              commentsCount={document?.commentsCountByPage[""] || 0}
              recommendsCount={document?.recommendsCount || 0}
            />
          )}
        </>
      }
    />
  );
}

export function PostByline(props: {
  record: NonNullable<PostPageData>["normalizedDocument"];
  profile?: ProfileViewDetailed;
  contributors?: BylineProfile[];
  hideTags?: boolean;
}) {
  // Only keep contributors that resolve to a real name (displayName or handle).
  // Unresolved profiles (bare DIDs) would otherwise render empty clickable
  // spans and stray separators. When none remain we fall back to the
  // single-author `profile` path below.
  let namedContributors = (props.contributors ?? []).filter(
    (c) => c.displayName || c.handle,
  );
  const frame = usePostFrame();
  const tagDrawerNav = useMemo(
    () => ({ push: (thread: DrawerThread) => frame.openThread(thread) }),
    [frame],
  );
  const record = props.record;
  const formattedDate = useLocalizedDate(
    record?.publishedAt || new Date().toISOString(),
    {
      year: "numeric",
      month: "long",
      day: "2-digit",
    },
  );
  const tags = record.tags ?? [];
  const tagCount = props.hideTags ? 0 : tags.length;

  return (
    <div className="flex flex-row gap-2 items-center">
      {namedContributors.length > 0 ? (
        <div className="flex flex-row flex-wrap items-center text-tertiary">
          {namedContributors.map((c, i) => (
            <Fragment key={c.did}>
              {i > 0 && (
                <span className="whitespace-pre">
                  {bylineSeparator(i, namedContributors.length)}
                </span>
              )}
              <ProfilePopover
                didOrHandle={c.did}
                trigger={
                  <span className="hover:underline">{bylineName(c)}</span>
                }
              />
            </Fragment>
          ))}
        </div>
      ) : props.profile ? (
        <ProfilePopover
          didOrHandle={props.profile.did}
          trigger={
            <span className="text-tertiary hover:underline">
              {props.profile.displayName || props.profile.handle}
            </span>
          }
        />
      ) : null}
      {record.publishedAt ? (
        <>
          <Separator classname="h-4!" />
          <p>
            <time dateTime={record.publishedAt}>{formattedDate}</time>
          </p>
        </>
      ) : null}
      {tagCount > 0 && (
        <>
          <Separator classname="h-4!" />
          {/* TagPopover reads this off context to open the tag wherever the
              post's frame shows tags. */}
          <DrawerThreadContext.Provider value={tagDrawerNav}>
            <TagPopover tags={tags} />
          </DrawerThreadContext.Provider>
        </>
      )}
    </div>
  );
}

// `compact` is the post header block's condensed mode: tighter spacing and a
// smaller title, for a header that shares a canvas with the content.
export const PostHeaderLayout = (props: {
  pubLink: React.ReactNode;
  postTitle: React.ReactNode | undefined;
  postDescription: React.ReactNode | undefined;
  postInfo: React.ReactNode;
  compact?: boolean;
}) => {
  return (
    <header
      className={`postHeader w-full flex flex-col px-3 sm:px-4 ${props.compact ? "pt-2 pb-3" : "sm:pt-3 pt-2 pb-5"}`}
      id="post-header"
    >
      <div
        className={`pubInfo relative flex text-accent-contrast font-bold justify-between w-full ${props.compact ? "text-sm" : ""}`}
      >
        {props.pubLink}
      </div>
      {props.postTitle && (
        <h1
          className={`postTitle leading-tight pt-0.5 font-bold outline-hidden bg-transparent ${props.compact ? "text-lg" : "text-2xl"}`}
        >
          {props.postTitle}
        </h1>
      )}
      {props.postDescription ? (
        <div className="postDescription italic text-secondary outline-hidden bg-transparent pt-2">
          {props.postDescription}
        </div>
      ) : null}
      <div
        className={`postInfo text-sm text-tertiary flex gap-1 flex-wrap justify-between ${props.compact ? "pt-1.5" : "pt-3"}`}
      >
        {props.postInfo}
      </div>
    </header>
  );
};
