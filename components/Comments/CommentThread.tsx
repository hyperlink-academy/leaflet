"use client";

import { useCallback, useEffect, useState } from "react";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { v7 } from "uuid";
import { generateKeyBetween } from "fractional-indexing";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useIdentityData } from "components/IdentityProvider";
import { useUIState } from "src/useUIState";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";
import { DeleteTiny } from "components/Icons/DeleteTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { CommentMessageLayout } from "./CommentMessageLayout";
import { CommentComposer } from "./CommentComposer";
import { CommentLoginPrompt } from "./CommentLoginPrompt";
import { EditTiny } from "components/Icons/EditTiny";

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
  // Messages in this thread currently being edited in place; while any is,
  // the Reply affordance is hidden so the two composers don't stack
  let [editingMessages, setEditingMessages] = useState<Set<string>>(
    () => new Set(),
  );
  let onMessageEditingChange = useCallback(
    (entityID: string, editing: boolean) => {
      setEditingMessages((prev) => {
        if (prev.has(entityID) === editing) return prev;
        let next = new Set(prev);
        if (editing) next.add(entityID);
        else next.delete(entityID);
        return next;
      });
    },
    [],
  );

  let submitReply = async (ydoc: Y.Doc) => {
    if (!rep.rep || !identity?.atp_did) return;
    let lastPosition =
      replies.length > 0 ? replies[replies.length - 1].data.position : null;
    // A reply is several facts; undo them as one step
    rep.undoManager.startGroup();
    try {
      await rep.rep.mutate.createCommentReply({
        replyEntityID: v7(),
        commentEntityID: props.commentEntityID,
        permission_set: entity_set.set,
        position: generateKeyBetween(lastPosition, null),
        authorDid: identity.atp_did,
        createdAt: new Date().toISOString(),
        content: base64.fromByteArray(Y.encodeStateAsUpdate(ydoc)),
      });
    } finally {
      rep.undoManager.endGroup();
    }
    setReplying(false);
  };

  return (
    <div
      className="comment-thread flex flex-col gap-2"
      data-comment-thread={props.commentEntityID}
    >
      <CommentMessage
        entityID={props.commentEntityID}
        onEditingChange={onMessageEditingChange}
        // The top-level comment has no delete action — resolving supersedes it
        // (resolved comments are hidden but their data and anchors are kept).
        // Anyone with edit permission can resolve.
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
              onEditingChange={onMessageEditingChange}
              onDelete={async () => {
                // Deleting a reply retracts several facts; undo as one step
                rep.undoManager.startGroup();
                try {
                  await rep.rep?.mutate.deleteCommentReply({
                    replyEntityID: r.data.value,
                    commentEntityID: props.commentEntityID,
                  });
                } finally {
                  rep.undoManager.endGroup();
                }
              }}
            />
          ))}
        </div>
      )}
      {replies.length > 0 && (
        <div className="comment-thread-reply-count text-xs text-tertiary">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </div>
      )}
      {/* Drop the actions row entirely when empty so it doesn't leave a
          stray flex gap below the thread */}
      {!entity_set.permissions.write ||
      (!replying && editingMessages.size > 0) ? null : (
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
      )}
    </div>
  );
}

function CommentMessage(props: {
  entityID: string;
  onDelete?: () => void;
  onResolve?: () => void;
  onEditingChange?: (entityID: string, editing: boolean) => void;
}) {
  let rep = useReplicache();
  let { permissions } = useEntitySetContext();
  let content = useEntity(props.entityID, "block/text");
  let author = useEntity(props.entityID, "comment/author");
  let createdAt = useEntity(props.entityID, "comment/created-at");
  let { identity } = useIdentityData();
  let authorDid = author?.data.value;
  let isOwn = !!identity?.atp_did && identity.atp_did === authorDid;
  // Editing and deleting are write interactions, available to the author only
  let canModify = isOwn && permissions.write;
  let [editing, setEditing] = useState(false);
  let { onEditingChange, entityID } = props;
  // Reported via effect so the cleanup also fires if the message unmounts
  // mid-edit (e.g. a collaborator deletes it)
  useEffect(() => {
    if (!editing) return;
    onEditingChange?.(entityID, true);
    return () => onEditingChange?.(entityID, false);
  }, [editing, onEditingChange, entityID]);

  let submitEdit = async (ydoc: Y.Doc) => {
    if (!authorDid) return;
    // Editing retracts the old body and asserts the new one; undo as one step
    rep.undoManager.startGroup();
    try {
      await rep.rep?.mutate.editComment({
        entityID: props.entityID,
        authorDid,
        content: base64.fromByteArray(Y.encodeStateAsUpdate(ydoc)),
      });
    } finally {
      rep.undoManager.endGroup();
    }
    setEditing(false);
  };

  // Delete/edit are hover-revealed in the dense desktop side column, but on
  // touch (no hover) they always stay visible. xl matches the 1280px desktop
  // breakpoint used elsewhere for comments.
  let hoverRevealClass =
    "shrink-0 text-tertiary hover:text-accent-contrast opacity-100 xl:opacity-0 xl:group-hover/comment-message:opacity-100 xl:focus:opacity-100";

  // The composer renders the same CommentMessageLayout as the message, so
  // swapping one for the other doesn't shift the content around
  if (editing)
    return (
      <CommentComposer
        autoFocus
        submitLabel="Save"
        initialContent={content?.data.value}
        onSubmit={submitEdit}
        onCancel={() => setEditing(false)}
      />
    );

  return (
    <CommentMessageLayout
      did={authorDid}
      className="group/comment-message"
      headerActions={
        <>
          {createdAt && (
            <div className="text-xs text-tertiary shrink-0">
              {formatCommentDate(createdAt.data.value)}
            </div>
          )}
          {canModify && (
            <button
              className={hoverRevealClass}
              onClick={() => setEditing(true)}
              title="Edit comment"
            >
              <EditTiny />
            </button>
          )}
          {canModify && props.onDelete && (
            <button
              className={hoverRevealClass}
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
        </>
      }
    >
      <RenderYJSFragment value={content?.data.value || ""} wrapper="p" />
    </CommentMessageLayout>
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
