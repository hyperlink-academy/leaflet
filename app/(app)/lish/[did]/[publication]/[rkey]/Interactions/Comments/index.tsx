"use client";
import { useInteractionState, setInteractionState } from "../Interactions";
import { useIdentityData } from "components/IdentityProvider";
import { CommentBox } from "./CommentBox";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { BaseTextBlock } from "../../Blocks/BaseTextBlock";
import { useMemo, useState } from "react";
import { CollapsibleReplies } from "components/CollapsibleReplies";
import { CommentTiny } from "components/Icons/CommentTiny";
import { Separator } from "components/Layout";
import { Popover } from "components/Popover";
import { AtUri } from "@atproto/api";
import { usePathname } from "next/navigation";
import { QuoteContent } from "../Quotes";
import { timeAgo } from "src/utils/timeAgo";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { ProfilePopover } from "components/ProfilePopover";
import { LoginModal } from "components/LoginButton";
import { type Profile } from "src/identity";
import { PostInfo } from "../../BskyPostContent";
import { Avatar } from "components/Avatar";
import { EmptyState } from "components/EmptyState";

export type Comment = {
  record: Json;
  uri: string;
  profile: Profile | null;
};
export function CommentsDrawerContent(props: {
  document_uri: string;
  comments: Comment[];
  noCommentBox?: boolean;
  pageId?: string;
}) {
  let { identity } = useIdentityData();
  let { localComments, pageId: statePageId } = useInteractionState(
    props.document_uri,
  );
  // Callers (e.g. the discussion modal) can pin the page explicitly; otherwise
  // fall back to the page tracked in the shared interaction state.
  let pageId = props.pageId ?? statePageId;
  let comments = useMemo(() => {
    let filtered = props.comments.filter(
      (c) => (c.record as PubLeafletComment.Record)?.onPage === pageId,
    );
    return [
      ...localComments.filter((c) => (c.record as any)?.onPage === pageId),
      ...filtered,
    ];
  }, [props.comments, localComments, pageId]);
  let pathname = usePathname();
  let redirectRoute = useMemo(() => {
    if (typeof window === "undefined") return;
    let url = new URL(pathname, window.location.origin);
    url.searchParams.set("refreshAuth", "");
    url.searchParams.set("interactionDrawer", "comments");
    url.hash = "commentsDrawer";
    return url.toString();
  }, []);

  return (
    <div
      id={"commentsDrawer"}
      className="flex flex-col gap-2 relative text-sm text-secondary"
    >
      {!props.noCommentBox && (
        <>
          {identity?.atp_did ? (
            <CommentBox doc_uri={props.document_uri} pageId={pageId} />
          ) : (
            <div className="w-full accent-container text-tertiary text-center italic p-3 gap-2">
              <span className="text-accent-contrast font-bold">
                <LoginModal
                  noEmailLogin
                  trigger={identity ? "Link" : "Log in"}
                  redirectRoute={redirectRoute}
                />
              </span>{" "}
              {identity ? " " : "with "}
              an Atmosphere account to comment
            </div>
          )}
          <hr className="border-border-light" />
        </>
      )}
      <div className="comments flex flex-col gap-4 sm:gap-6 py-2">
        {comments.length === 0 && <EmptyState>No comments yet…</EmptyState>}
        {comments.length > 0 &&
          comments
            .sort((a, b) => {
              let aRecord = a.record as PubLeafletComment.Record;
              let bRecord = b.record as PubLeafletComment.Record;
              return (
                new Date(bRecord.createdAt).getTime() -
                new Date(aRecord.createdAt).getTime()
              );
            })
            .filter(
              (comment) => !(comment.record as PubLeafletComment.Record).reply,
            )
            .map((comment) => {
              let record = comment.record as PubLeafletComment.Record;
              return (
                <>
                  <Comment
                    pageId={pageId}
                    profile={comment.profile}
                    document={props.document_uri}
                    comment={comment}
                    record={record}
                    comments={comments}
                    key={comment.uri}
                  />
                  <hr className="border-border last:hidden" />
                </>
              );
            })}
      </div>
    </div>
  );
}

const Comment = (props: {
  document: string;
  comment: Comment;
  comments: Comment[];
  profile: Profile | null;
  record: PubLeafletComment.Record;
  pageId?: string;
}) => {
  const did = props.profile?.did;

  return (
    <div
      id={props.comment.uri}
      className="comment flex gap-2 pointer-events-auto"
    >
      <Avatar
        src={props.profile?.avatar || undefined}
        displayName={
          props.profile?.displayName
            ? props.profile?.displayName
            : props.profile?.handle || undefined
        }
        size={"medium"}
      />

      <div className="min-w-0 w-full grow flex flex-col pt-1">
        <PostInfo
          displayName={props.profile?.displayName}
          handle={props.profile?.handle || ""}
          createdAt={props.record.createdAt}
          compact
        />

        {props.record.attachment &&
          PubLeafletComment.isLinearDocumentQuote(props.record.attachment) && (
            <div className="my-2 ">
              <QuoteContent
                index={-1}
                position={props.record.attachment.quote}
                did={new AtUri(props.record.attachment.document).host}
              />
            </div>
          )}
        <pre
          key={props.comment.uri}
          style={{ wordBreak: "break-word", fontFamily: "inherit" }}
          className="whitespace-pre-wrap text-secondary pb-[4px] "
        >
          <BaseTextBlock
            index={[]}
            plaintext={props.record.plaintext}
            facets={props.record.facets}
          />
        </pre>
        <Replies
          pageId={props.pageId}
          comment_uri={props.comment.uri}
          comments={props.comments}
          document={props.document}
        />
      </div>
    </div>
  );
};

const Replies = (props: {
  comment_uri: string;
  comments: Comment[];
  document: string;
  pageId?: string;
}) => {
  let { identity } = useIdentityData();

  let [replyBoxOpen, setReplyBoxOpen] = useState(false);
  let [repliesOpen, setRepliesOpen] = useState(true);

  let replies = props.comments
    .filter(
      (comment) =>
        (comment.record as PubLeafletComment.Record).reply?.parent ===
        props.comment_uri,
    )
    .sort((a, b) => {
      let aRecord = a.record as PubLeafletComment.Record;
      let bRecord = b.record as PubLeafletComment.Record;
      return (
        new Date(bRecord.createdAt).getTime() -
        new Date(aRecord.createdAt).getTime()
      );
    });

  return (
    <>
      <div className="flex gap-2 items-center">
        <button
          className="flex gap-1 items-center text-sm text-tertiary"
          onClick={() => {
            setRepliesOpen(!repliesOpen);
            setReplyBoxOpen(false);
          }}
        >
          <CommentTiny className="text-border" />{" "}
          {replies.length !== 0 && replies.length}
        </button>
        {identity?.atp_did && (
          <button
            className="text-accent-contrast text-sm"
            onClick={() => {
              setRepliesOpen(true);
              setReplyBoxOpen(true);
            }}
          >
            Reply
          </button>
        )}
      </div>
      {replyBoxOpen && (
        <div className="repliesWrapper flex w-full pt-1">
          <button
            className="repliesCollapse mr-[14px] ml-[7px]"
            onClick={() => {
              setReplyBoxOpen(false);
              setRepliesOpen(false);
            }}
          >
            <div className="bg-border-light w-[2px] h-full" />
          </button>
          <CommentBox
            className="pt-3"
            pageId={props.pageId}
            doc_uri={props.document}
            replyTo={props.comment_uri}
            autoFocus={true}
            onSubmit={() => {
              setReplyBoxOpen(false);
            }}
          />
        </div>
      )}
      {replies.length > 0 && (
        <CollapsibleReplies open={repliesOpen}>
          <div className="repliesWrapper flex pt-1 relative">
            {/* the thread line itself is non-interactive; a transparent button
                is overlaid on top of it (z-10) to catch clicks, so the line
                stays clickable even though the comments re-enable pointer
                events with pointer-events-auto */}
            <div className="-mr-[14px] ml-[7px] pointer-events-none">
              <div className="bg-border-light w-[2px] h-full" />
            </div>
            <button
              className="repliesCollapse absolute top-0 bottom-0 left-0 w-[20px] z-10"
              onClick={() => {
                setReplyBoxOpen(false);
                setRepliesOpen(false);
              }}
            />
            <div className="repliesContent flex flex-col gap-8 pt-4 w-full">
              {replies.map((reply) => {
                return (
                  <Comment
                    pageId={props.pageId}
                    document={props.document}
                    key={reply.uri}
                    comment={reply}
                    profile={reply.profile}
                    record={reply.record as PubLeafletComment.Record}
                    comments={props.comments}
                  />
                );
              })}
            </div>
          </div>
        </CollapsibleReplies>
      )}
    </>
  );
};

const DatePopover = (props: { date: string }) => {
  const timeAgoText = useMemo(() => timeAgo(props.date), [props.date]);
  const fullDate = useLocalizedDate(props.date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Popover
      trigger={
        <div className="italic text-sm text-tertiary hover:underline">
          {timeAgoText}
        </div>
      }
    >
      <div className="text-sm text-secondary">{fullDate}</div>
    </Popover>
  );
};
