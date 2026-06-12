"use client";

import { useState } from "react";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { v7 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { useUIState } from "src/useUIState";
import { Avatar } from "components/Avatar";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";
import { DeleteTiny } from "components/Icons/DeleteTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { CommentComposer } from "./CommentComposer";
import { CommentLoginPrompt } from "./CommentLoginPrompt";
import { deleteCommentFromBlock } from "./commentDraftActions";

export function CommentThread(props: {
  commentEntityID: string;
  blockID: string;
  pageID: string;
}) {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let { identity } = useIdentityData();
  let replies = useEntity(props.commentEntityID, "comment/reply").toSorted(
    (a, b) => (a.data.position > b.data.position ? 1 : -1),
  );
  let [replying, setReplying] = useState(false);

  let submitReply = async (ydoc: Y.Doc) => {
    if (!rep.rep || !identity?.atp_did) return;
    let lastPosition =
      replies.length > 0 ? replies[replies.length - 1].data.position : null;
    await rep.rep.mutate.createCommentReply({
      replyEntityID: v7(),
      commentEntityID: props.commentEntityID,
      permission_set: entity_set.set,
      position: generateKeyBetween(lastPosition, null),
      authorDid: identity.atp_did,
      createdAt: new Date().toISOString(),
      content: base64.fromByteArray(Y.encodeStateAsUpdate(ydoc)),
    });
    setReplying(false);
  };

  return (
    <div
      className="comment-thread flex flex-col gap-2"
      data-comment-thread={props.commentEntityID}
    >
      <CommentMessage
        entityID={props.commentEntityID}
        onDelete={() =>
          deleteCommentFromBlock(props.commentEntityID, props.blockID, rep.rep)
        }
        // Anyone with edit permission can resolve; resolved comments are
        // hidden but their data and anchors are kept
        onResolve={
          entity_set.permissions.write
            ? () =>
                rep.rep?.mutate.assertFact({
                  entity: props.commentEntityID,
                  attribute: "comment/resolved",
                  data: { type: "boolean", value: true },
                })
            : undefined
        }
      />
      {replies.length > 0 && (
        <div className="comment-thread-replies flex flex-col gap-2 pl-2 border-l border-border-light">
          {replies.map((r) => (
            <CommentMessage
              key={r.data.value}
              entityID={r.data.value}
              onDelete={() =>
                rep.rep?.mutate.deleteCommentReply({
                  replyEntityID: r.data.value,
                  commentEntityID: props.commentEntityID,
                })
              }
            />
          ))}
        </div>
      )}
      {replies.length > 0 && (
        <div className="comment-thread-reply-count text-xs text-tertiary">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </div>
      )}
      <div className="comment-thread-actions">
        {!identity?.atp_did ? (
          <CommentLoginPrompt action="reply" />
        ) : replying ? (
          <CommentComposer
            placeholder="Reply..."
            submitLabel="Reply"
            autoFocus
            onSubmit={submitReply}
            onCancel={() => setReplying(false)}
          />
        ) : (
          <button
            className="text-xs text-tertiary hover:text-accent-contrast"
            onClick={() => {
              setReplying(true);
              useUIState.setState({
                focusedEntity: {
                  entityType: "comment",
                  entityID: props.commentEntityID,
                  parent: props.pageID,
                },
              });
            }}
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

function CommentMessage(props: {
  entityID: string;
  onDelete?: () => void;
  onResolve?: () => void;
}) {
  let content = useEntity(props.entityID, "block/text");
  let author = useEntity(props.entityID, "comment/author");
  let createdAt = useEntity(props.entityID, "comment/created-at");
  let { identity } = useIdentityData();
  let authorDid = author?.data.value;
  let { data: profile } = useRecordFromDid(authorDid);
  let isOwn = !!identity?.atp_did && identity.atp_did === authorDid;

  return (
    <div className="comment-message flex flex-col gap-0.5 group/comment-message">
      <div className="flex gap-2 items-center min-w-0">
        <Avatar
          src={profile?.avatar}
          displayName={profile?.displayName || profile?.handle}
          size="small"
        />
        <div className="font-bold text-sm text-secondary truncate grow">
          {profile?.displayName || profile?.handle || "..."}
        </div>
        {createdAt && (
          <div className="text-xs text-tertiary shrink-0">
            {formatCommentDate(createdAt.data.value)}
          </div>
        )}
        {isOwn && props.onDelete && (
          <button
            className="shrink-0 text-tertiary hover:text-accent-contrast opacity-0 group-hover/comment-message:opacity-100 focus:opacity-100"
            onClick={props.onDelete}
            title="Delete comment"
          >
            <DeleteTiny />
          </button>
        )}
        {props.onResolve && (
          <button
            className="shrink-0 text-tertiary hover:text-accent-contrast"
            onClick={props.onResolve}
            title="Resolve comment"
          >
            <CheckTiny />
          </button>
        )}
      </div>
      <div
        className="comment-message-content text-sm text-primary"
        style={{ wordBreak: "break-word" }}
      >
        <RenderYJSFragment value={content?.data.value || ""} wrapper="p" />
      </div>
    </div>
  );
}

function formatCommentDate(value: string) {
  let date = new Date(value);
  if (isNaN(date.getTime())) return "";
  let now = new Date();
  let sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
