"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useInteractionState, setInteractionState } from "../Interactions";
import { useIdentityData } from "components/IdentityProvider";
import { CommentBox } from "./CommentBox";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { BaseTextBlock } from "../../Blocks/BaseTextBlock";
import { useMemo, useState } from "react";
import { CommentTiny } from "components/Icons/CommentTiny";
import { Separator } from "components/Layout";
import { ButtonPrimary } from "components/Buttons";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { Popover } from "components/Popover";
import { AppBskyActorProfile, AtUri } from "@atproto/api";
import { BlueskyLogin } from "app/login/LoginForm";
import { usePathname } from "next/navigation";
import { QuoteContent } from "../Quotes";
import { timeAgo } from "src/utils/timeAgo";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { ProfilePopover } from "components/ProfilePopover";

export type Comment = {
  record: Json;
  uri: string;
  bsky_profiles: { record: Json; did: string } | null;
};
export function Comments(props: {
  document_uri: string;
  comments: Comment[];
  pageId?: string;
}) {
  let { identity } = useIdentityData();
  let { localComments } = useInteractionState(props.document_uri);
  let comments = useMemo(() => {
    return [
      ...localComments.filter(
        (c) => (c.record as any)?.onPage === props.pageId,
      ),
      ...props.comments,
    ];
  }, [props.comments, localComments]);
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
      <div className="w-full flex justify-between text-secondary font-bold">
        Comments
        <button
          className="text-tertiary"
          onClick={() =>
            setInteractionState(props.document_uri, { drawerOpen: false })
          }
        >
          <CloseTiny />
        </button>
      </div>
      {identity?.atp_did ? (
        <CommentBox doc_uri={props.document_uri} pageId={props.pageId} />
      ) : (
        <div className="w-full accent-container text-tertiary text-center italic p-3 flex flex-col gap-2">
          Connect a Bluesky account to comment
          <BlueskyLogin redirectRoute={redirectRoute} />
        </div>
      )}
      <hr className="border-border-light" />
      <div className="flex flex-col gap-6 py-2">
        {comments
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
            let profile = comment.bsky_profiles
              ?.record as AppBskyActorProfile.Record;
            return (
              <Comment
                pageId={props.pageId}
                profile={profile}
                document={props.document_uri}
                comment={comment}
                record={record}
                comments={comments}
                key={comment.uri}
              />
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
  profile: AppBskyActorProfile.Record;
  record: PubLeafletComment.Record;
  pageId?: string;
}) => {
  const did = props.comment.bsky_profiles?.did;

  return (
    <div id={props.comment.uri} className="comment">
      <div className="flex gap-2">
        {did && (
          <ProfilePopover
            didOrHandle={did}
            trigger={
              <div className="text-sm text-tertiary font-bold hover:underline">
                {props.profile.displayName}
              </div>
            }
          />
        )}
      </div>
      {props.record.attachment &&
        PubLeafletComment.isLinearDocumentQuote(props.record.attachment) && (
          <div className="mt-1 mb-2">
            <QuoteContent
              index={-1}
              position={props.record.attachment.quote}
              did={new AtUri(props.record.attachment.document).host}
            />
          </div>
        )}
      <pre
        key={props.comment.uri}
        style={{ wordBreak: "break-word" }}
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

  let repliesOrReplyBoxOpen =
    replyBoxOpen || (repliesOpen && replies.length > 0);
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
          <CommentTiny className="text-border" /> {replies.length}
        </button>
        {identity?.atp_did && (
          <>
            <Separator classname="h-[14px]" />
            <button
              className="text-accent-contrast text-sm"
              onClick={() => {
                setRepliesOpen(true);
                setReplyBoxOpen(true);
              }}
            >
              Reply
            </button>
          </>
        )}
      </div>
      {repliesOrReplyBoxOpen && (
        <div className="flex flex-col pt-1">
          {replyBoxOpen && (
            <div className="repliesWrapper flex w-full">
              <button
                className="repliesCollapse pr-[14px] ml-[7px]"
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
          {repliesOpen && replies.length > 0 && (
            <div className="repliesWrapper flex">
              <button
                className="repliesCollapse pr-[14px] ml-[7px]"
                onClick={() => {
                  setReplyBoxOpen(false);
                  setRepliesOpen(false);
                }}
              >
                <div className="bg-border-light w-[2px] h-full" />
              </button>
              <div className="repliesContent flex flex-col gap-3 pt-2 w-full">
                {replies.map((reply) => {
                  return (
                    <Comment
                      pageId={props.pageId}
                      document={props.document}
                      key={reply.uri}
                      comment={reply}
                      profile={
                        reply.bsky_profiles
                          ?.record as AppBskyActorProfile.Record
                      }
                      record={reply.record as PubLeafletComment.Record}
                      comments={props.comments}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
