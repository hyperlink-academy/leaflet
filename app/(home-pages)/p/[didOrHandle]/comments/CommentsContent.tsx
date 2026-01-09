"use client";

import { useEffect, useRef, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { AppBskyActorProfile, AtUri } from "@atproto/api";
import { PubLeafletComment, PubLeafletDocument } from "lexicons/api";
import { ReplyTiny } from "components/Icons/ReplyTiny";
import { Avatar } from "components/Avatar";
import { BaseTextBlock } from "app/lish/[did]/[publication]/[rkey]/Blocks/BaseTextBlock";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import {
  getProfileComments,
  type ProfileComment,
  type Cursor,
} from "./getProfileComments";
import { timeAgo } from "src/utils/timeAgo";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

export const ProfileCommentsContent = (props: {
  did: string;
  comments: ProfileComment[];
  nextCursor: Cursor | null;
}) => {
  const getKey = (
    pageIndex: number,
    previousPageData: {
      comments: ProfileComment[];
      nextCursor: Cursor | null;
    } | null,
  ) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;

    // First page, we don't have previousPageData
    if (pageIndex === 0) return ["profile-comments", props.did, null] as const;

    // Add the cursor to the key
    return [
      "profile-comments",
      props.did,
      previousPageData?.nextCursor,
    ] as const;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([_, did, cursor]) => getProfileComments(did, cursor),
    {
      fallbackData: [
        { comments: props.comments, nextCursor: props.nextCursor },
      ],
      revalidateFirstPage: false,
    },
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer to load more when trigger element is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating) {
          const hasMore = data && data[data.length - 1]?.nextCursor;
          if (hasMore) {
            setSize(size + 1);
          }
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [data, size, setSize, isValidating]);

  const allComments = data ? data.flatMap((page) => page.comments) : [];

  if (allComments.length === 0 && !isValidating) {
    return (
      <div className="text-tertiary text-center py-4">No comments yet</div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-left relative">
      {allComments.map((comment) => (
        <CommentItem key={comment.uri} comment={comment} />
      ))}
      {/* Trigger element for loading more comments */}
      <div
        ref={loadMoreRef}
        className="absolute bottom-96 left-0 w-full h-px pointer-events-none"
        aria-hidden="true"
      />
      {isValidating && (
        <div className="text-center text-tertiary py-4">
          Loading more comments...
        </div>
      )}
    </div>
  );
};

const CommentItem = ({ comment }: { comment: ProfileComment }) => {
  const record = comment.record as PubLeafletComment.Record;
  const profile = comment.bsky_profiles?.record as
    | AppBskyActorProfile.Record
    | undefined;
  const displayName =
    profile?.displayName || comment.bsky_profiles?.handle || "Unknown";

  // Get commenter DID from comment URI
  const commenterDid = new AtUri(comment.uri).host;

  const isReply = !!record.reply;

  // Get document title
  const docData = comment.document?.data as
    | PubLeafletDocument.Record
    | undefined;
  const postTitle = docData?.title || "Untitled";

  // Get parent comment info for replies
  const parentRecord = comment.parentComment?.record as
    | PubLeafletComment.Record
    | undefined;
  const parentProfile = comment.parentComment?.bsky_profiles?.record as
    | AppBskyActorProfile.Record
    | undefined;
  const parentDisplayName =
    parentProfile?.displayName || comment.parentComment?.bsky_profiles?.handle;

  // Build direct link to the comment
  const commentLink = useMemo(() => {
    if (!comment.document) return null;
    const docUri = new AtUri(comment.document.uri);

    // Get base URL using getPublicationURL if publication exists, otherwise build path
    let baseUrl: string;
    if (comment.publication) {
      baseUrl = getPublicationURL(comment.publication);
      const pubUri = new AtUri(comment.publication.uri);
      // If getPublicationURL returns a relative path, append the document rkey
      if (baseUrl.startsWith("/")) {
        baseUrl = `${baseUrl}/${docUri.rkey}`;
      } else {
        // For custom domains, append the document rkey
        baseUrl = `${baseUrl}/${docUri.rkey}`;
      }
    } else {
      baseUrl = `/lish/${docUri.host}/-/${docUri.rkey}`;
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.set("interactionDrawer", "comments");
    if (record.onPage) {
      params.set("page", record.onPage);
    }

    // Use comment URI as hash for direct reference
    const commentId = encodeURIComponent(comment.uri);

    return `${baseUrl}?${params.toString()}#${commentId}`;
  }, [comment.document, comment.publication, comment.uri, record.onPage]);

  // Get avatar source
  const avatarSrc = profile?.avatar?.ref
    ? blobRefToSrc(profile.avatar.ref, commenterDid)
    : undefined;

  return (
    <div id={comment.uri} className="w-full flex flex-col text-left mb-8">
      <div className="flex gap-2 w-full">
        <Avatar src={avatarSrc} displayName={displayName} />
        <div className="flex flex-col w-full min-w-0 grow">
          <div className="flex flex-row gap-2 justify-between">
            <div className="text-tertiary text-sm truncate">
              <span className="font-bold text-secondary">{displayName}</span>{" "}
              {isReply ? "replied" : "commented"} on{" "}
              {commentLink ? (
                <a
                  href={commentLink}
                  className="italic text-accent-contrast hover:underline"
                >
                  {postTitle}
                </a>
              ) : (
                <span className="italic text-accent-contrast">{postTitle}</span>
              )}
            </div>
            <div className="text-tertiary text-sm shrink-0">
              {timeAgo(record.createdAt)}
            </div>
          </div>
          {isReply && parentRecord && (
            <div className="text-xs text-tertiary flex flex-row gap-2 w-full my-0.5 items-center">
              <ReplyTiny className="shrink-0 scale-75" />
              {parentDisplayName && (
                <div className="font-bold shrink-0">{parentDisplayName}</div>
              )}
              <div className="grow truncate">{parentRecord.plaintext}</div>
            </div>
          )}
          <pre
            style={{ wordBreak: "break-word" }}
            className="whitespace-pre-wrap text-secondary"
          >
            <BaseTextBlock
              index={[]}
              plaintext={record.plaintext}
              facets={record.facets}
            />
          </pre>
        </div>
      </div>
    </div>
  );
};
