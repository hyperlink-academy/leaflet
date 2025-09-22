"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useInteractionState, setInteractionState } from "../Interactions";
import { useIdentityData } from "components/IdentityProvider";
import { CommentBox } from "./CommentBox";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { BaseTextBlock } from "../../BaseTextBlock";
import { useMemo, useState } from "react";
import { CommentTiny } from "components/Icons/CommentTiny";
import { Separator } from "components/Layout";
import { ButtonPrimary } from "components/Buttons";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { Popover } from "components/Popover";
import { AppBskyActorProfile, AtUri } from "@atproto/api";
import { timeAgo } from "app/discover/PubListing";
import { BlueskyLogin } from "app/login/LoginForm";
import { usePathname } from "next/navigation";
import { QuoteContent } from "../Quotes";

export type Comment = {
  record: Json;
  uri: string;
  bsky_profiles: { record: Json } | null;
};
export function Comments(props: { document_uri: string; comments: Comment[] }) {
  let { identity } = useIdentityData();
  let { localComments } = useInteractionState(props.document_uri);
  let comments = useMemo(() => {
    return [...localComments, ...props.comments];
  }, [props.comments, localComments]);
  let pathname = usePathname();
  let redirectRoute = useMemo(() => {
    let url = new URL(pathname, window.location.origin);
    url.searchParams.set("refreshAuth", "");
    url.searchParams.set("interactionDrawer", "comments");
    url.hash = "commentsDrawer";
    return url.toString();
  }, []);

  return (
    <div id={"commentsDrawer"} className="flex flex-col gap-2 relative">
      <div className="w-full flex justify-between text-secondary font-bold">
        Comments
        <button
          className="text-tertiary"
          onClick={() => setInteractionState(props.document_uri, { drawerOpen: false })}
        >
          <CloseTiny />
        </button>
      </div>
      {identity?.atp_did ? (
        <CommentBox doc_uri={props.document_uri} />
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
  profile?: AppBskyActorProfile.Record;
  record: PubLeafletComment.Record;
}) => {
  return (
    <div className="comment">
      <div className="flex gap-2">
        {props.profile && (
          <ProfilePopover profile={props.profile} comment={props.comment.uri} />
        )}
        <DatePopover date={props.record.createdAt} />
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
      <div className="flex flex-col gap-2">
        {replyBoxOpen && (
          <CommentBox
            doc_uri={props.document}
            replyTo={props.comment_uri}
            autoFocus={true}
            onSubmit={() => {
              setReplyBoxOpen(false);
            }}
          />
        )}
        {repliesOpen && replies.length > 0 && (
          <div className="repliesWrapper flex">
            <button
              className="repliesCollapse pr-[14px] ml-[7px] pt-0.5"
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
                    document={props.document}
                    key={reply.uri}
                    comment={reply}
                    profile={
                      reply.bsky_profiles?.record as AppBskyActorProfile.Record
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
    </>
  );
};

const DatePopover = (props: { date: string }) => {
  let [t, full] = useMemo(() => {
    return [
      timeAgo(props.date),
      new Date(props.date).toLocaleTimeString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ];
  }, [props.date]);
  return (
    <Popover
      trigger={
        <div className="italic text-sm text-tertiary hover:underline">{t}</div>
      }
    >
      <div className="text-sm text-secondary">{full}</div>
    </Popover>
  );
};

const ProfilePopover = (props: {
  profile: AppBskyActorProfile.Record;
  comment: string;
}) => {
  let commenterId = new AtUri(props.comment).host;

  return (
    <>
      <a
        className="font-bold  text-tertiary text-sm hover:underline"
        href={`https://bsky.app/profile/${commenterId}`}
      >
        {props.profile.displayName}
      </a>
      {/*<Media mobile={false}>
        <Popover
          align="start"
          trigger={
            <div
              onMouseOver={() => {
                setHovering(true);
                hoverTimeout.current = window.setTimeout(() => {
                  setLoadProfile(true);
                }, 500);
              }}
              onMouseOut={() => {
                setHovering(false);
                clearTimeout(hoverTimeout.current);
              }}
              className="font-bold  text-tertiary text-sm hover:underline"
            >
              {props.profile.displayName}
            </div>
          }
          className="max-w-sm"
        >
          {profile && (
            <>
              <div className="profilePopover text-sm flex gap-2">
                <div className="w-5 h-5 bg-test rounded-full shrink-0 mt-[2px]" />
                <div className="flex flex-col">
                  <div className="flex justify-between">
                    <div className="profileHeader flex gap-2 items-center">
                      <div className="font-bold">celine</div>
                      <a className="text-tertiary" href="/">
                        @{profile.handle}
                      </a>
                    </div>
                  </div>

                  <div className="profileBio text-secondary ">
                    {profile.description}
                  </div>
                  <div className="flex flex-row gap-2 items-center pt-2 font-bold">
                    {!profile.viewer?.following ? (
                      <div className="text-tertiary bg-border-light rounded-md px-1 py-0">
                        Following
                      </div>
                    ) : (
                      <ButtonPrimary compact className="text-sm">
                        Follow <BlueskyTiny />
                      </ButtonPrimary>
                    )}
                    {profile.viewer?.followedBy && (
                      <div className="text-tertiary">Follows You</div>
                    )}
                  </div>
                </div>
              </div>

              <hr className="my-2 border-border-light" />
              <div className="flex gap-2 leading-tight items-center text-tertiary text-sm">
                <div className="flex flex-col w-6 justify-center">
                  {profile.viewer?.knownFollowers?.followers.map((follower) => {
                    return (
                      <div
                        className="w-[18px] h-[18px] bg-test rounded-full border-2 border-bg-page"
                        key={follower.did}
                      />
                    );
                  })}
                  <div className="w-[18px] h-[18px] bg-test rounded-full -mt-2 border-2 border-bg-page" />
                  <div className="w-[18px] h-[18px] bg-test rounded-full -mt-2 border-2 border-bg-page" />
                </div>
              </div>
            </>
          )}
        </Popover>
      </Media>*/}
    </>
  );
};
