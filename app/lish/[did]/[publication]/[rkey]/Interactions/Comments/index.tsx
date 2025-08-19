"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useInteractionState } from "../Interactions";
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
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";

export type Comment = {
  record: Json;
  uri: string;
};
export function Comments(props: {
  document_uri: string;
  comments: { record: Json; uri: string }[];
}) {
  let { identity } = useIdentityData();
  let localComments = useInteractionState((l) => l.localComments);
  let comments = useMemo(() => {
    return [...localComments, ...props.comments];
  }, [props.comments, localComments]);

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="w-full flex justify-between text-secondary font-bold">
        Comments
        <button
          className="text-tertiary"
          onClick={() => useInteractionState.setState({ drawerOpen: false })}
        >
          <CloseTiny />
        </button>
      </div>
      {identity?.atp_did ? (
        <CommentBox doc_uri={props.document_uri} />
      ) : (
        <div className="w-full accent-container text-tertiary text-center italic p-3">
          Connect a Bluesky account to comment
          <ButtonPrimary compact className="mx-auto mt-1">
            <BlueskyTiny /> Connect to Bluesky
          </ButtonPrimary>
        </div>
      )}
      <hr className="border-border-light" />
      <div className="flex flex-col gap-6">
        {comments.map((comment) => {
          let record = comment.record as PubLeafletComment.Record;
          return <Comment comment={comment} record={record} />;
        })}
      </div>
    </div>
  );
}

const Comment = (props: {
  comment: Comment;
  record: PubLeafletComment.Record;
}) => {
  return (
    <div className="comment">
      <div className="flex gap-2 items-baseline">
        <ProfilePopover />
        <DatePopover />
      </div>
      <pre
        key={props.comment.uri}
        className="whitespace-pre-wrap text-secondary pb-[4px]"
      >
        <BaseTextBlock
          index={[]}
          plaintext={props.record.plaintext}
          facets={props.record.facets}
        />
      </pre>
      <ReplyButton comment_uri={props.comment.uri} />
    </div>
  );
};

const ReplyButton = (props: { comment_uri: string }) => {
  let { identity } = useIdentityData();

  let [replyBoxOpen, setReplyBoxOpen] = useState(false);
  let [repliesOpen, setRepliesOpen] = useState(true);

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
          <CommentTiny className="text-border" /> 0
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
      {repliesOpen && (
        <div className="repliesWrapper flex">
          <button
            className="repliesCollapse pr-3 ml-[7px] pt-0.5"
            onClick={() => {
              setReplyBoxOpen(false);
              setRepliesOpen(false);
            }}
          >
            <div className="bg-border-light w-[2px] h-full" />
          </button>
          <div className="repliesContent flex flex-col gap-3 pt-2 w-full">
            {replyBoxOpen && <CommentBox doc_uri={props.comment_uri} />}
            <div className="reply">
              <div className="flex gap-2 text-sm text-tertiary">
                <div className="font-bold">celine</div>
                <div className="italic">5/3/25</div>
              </div>
              hello this is a reply
              <DummyReplyButton />
            </div>
            <div className="reply">
              <div className="flex gap-2 text-sm text-tertiary">
                <div className="font-bold">celine</div>{" "}
                <div className="italic">5/3/25</div>
              </div>
              hello this is a reply
              <DummyReplyButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DatePopover = () => {
  return (
    <Popover
      trigger={
        <div className="italic text-sm text-tertiary hover:underline">
          Yesterday
        </div>
      }
    >
      <div className="text-sm text-secondary">8/18/2025 4:32PM</div>
    </Popover>
  );
};

const ProfilePopover = () => {
  let following = true;
  let followsYou = false;

  return (
    <Popover
      align="start"
      trigger={<div className="font-bold hover:underline">celine</div>}
      className="max-w-sm"
    >
      <div className="profilePopover text-sm flex gap-2">
        <div className="w-5 h-5 bg-test rounded-full shrink-0 mt-[2px]" />
        <div className="flex flex-col">
          <div className="flex justify-between">
            <div className="profileHeader flex gap-2 items-center">
              <div className="font-bold">celine</div>
              <a className="text-tertiary" href="/">
                @cozylittle.house
              </a>
            </div>
          </div>

          <div className="profileBio text-secondary ">
            Design at leaflet.pub! Let's pretend my bio is a bit longer than
            this, what do i think of this now?
          </div>
          <div className="flex flex-row gap-2 items-center pt-2 font-bold">
            {!following ? (
              <div className="text-tertiary bg-border-light rounded-md px-1 py-0">
                Following
              </div>
            ) : (
              <ButtonPrimary compact className="text-sm">
                Follow <BlueskyTiny />
              </ButtonPrimary>
            )}
            {followsYou && <div className="text-tertiary">Follows You</div>}
          </div>
        </div>
      </div>

      <hr className="my-2 border-border-light" />
      <div className="flex gap-2 leading-tight items-center text-tertiary text-sm">
        <div className="flex flex-col w-6 justify-center">
          <div className="w-[18px] h-[18px] bg-test rounded-full border-2 border-bg-page" />
          <div className="w-[18px] h-[18px] bg-test rounded-full -mt-2 border-2 border-bg-page" />
          <div className="w-[18px] h-[18px] bg-test rounded-full -mt-2 border-2 border-bg-page" />
        </div>
        followed by Emily Liu, Maxim Leyzerovich, and 3 others
      </div>
    </Popover>
  );
};

const DummyReplyButton = () => {
  // this is a button that doesn't do anything
  // it should do the same thing as reply button, but because of the way i am writing this for testing
  // if i put replybutton within reply button it will recurse forever
  // please wire it when we have real data!

  let { identity } = useIdentityData();

  let [replyBoxOpen, setReplyBoxOpen] = useState(false);
  let [repliesOpen, setRepliesOpen] = useState(true);
  return (
    <div className="flex gap-2 items-center">
      <button
        className="flex gap-1 items-center text-sm text-tertiary"
        onClick={() => {
          setRepliesOpen(!repliesOpen);
          setReplyBoxOpen(false);
        }}
      >
        <CommentTiny className="text-border" /> 0
      </button>
      {!identity?.atp_did && (
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
  );
};
