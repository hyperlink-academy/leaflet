"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useInteractionState } from "../Interactions";
import { useIdentityData } from "components/IdentityProvider";
import { CommentBox } from "./CommentBox";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { BaseTextBlock } from "../../BaseTextBlock";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommentTiny } from "components/Icons/CommentTiny";
import { Separator } from "components/Layout";

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
        <div>login with bluesky to comment</div>
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
      <div className="flex gap-2 text-sm text-tertiary ">
        <div className="font-bold">celine</div>{" "}
        <div className="italic">5/3/25</div>
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
      </div>
      {repliesOpen && (
        <div className="repliesWrapper flex pt-1">
          <button
            className="repliesCollapse pr-3 ml-[7px] mt-1"
            onClick={() => {
              setReplyBoxOpen(false);
              setRepliesOpen(false);
            }}
          >
            <div className="bg-border w-[2px] h-full" />
          </button>
          <div className="repliesContent flex flex-col gap-3 pt-2 w-full">
            {replyBoxOpen && <CommentBox doc_uri={props.comment_uri} />}
            <div className="reply">
              <div className="flex gap-2 text-sm text-tertiary">
                <div className="font-bold">celine</div>{" "}
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

const DummyReplyButton = () => {
  // this is a button that doesn't do anything
  // it should do the same thing as reply button, but because of the way i am writing this for testing
  // if i put replybutton within reply button it will recurse forever
  // please wire it when we have real data!

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
    </div>
  );
};
