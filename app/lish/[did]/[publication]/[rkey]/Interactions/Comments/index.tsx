"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useInteractionState } from "../Interactions";
import { useIdentityData } from "components/IdentityProvider";
import { CommentBox } from "./CommentBox";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { BaseTextBlock } from "../../BaseTextBlock";
import { useMemo } from "react";

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
    <div className="flex flex-col gap-2">
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
      <hr />
      {comments.map((comment) => {
        let record = comment.record as PubLeafletComment.Record;
        return (
          <div>
            <pre key={comment.uri} className="whitespace-pre-wrap">
              <BaseTextBlock
                plaintext={record.plaintext}
                facets={record.facets}
              />
            </pre>
          </div>
        );
      })}
    </div>
  );
}
