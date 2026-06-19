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
import { EditorCommentMessageLayout } from "./EditorCommentMessageLayout";
import { EditorCommentComposer } from "./EditorCommentComposer";
import { removeEditorCommentMark } from "./editorCommentDraftActions";
import { EditorCommentLoginPrompt } from "./EditorCommentLoginPrompt";
import { EditTiny } from "components/Icons/EditTiny";
import { ButtonPrimary } from "components/Buttons";

export function EditorCommentThread(props: {
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
      await rep.rep.mutate.createEditorCommentReply({
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
  };

  return (
    <div
      className="editor-comment-thread flex flex-col gap-4"
      data-editor-comment-thread={props.commentEntityID}
    >
      <EditorCommentMessage
        entityID={props.commentEntityID}
        onEditingChange={onMessageEditingChange}
        // Resolving a thread deletes the top-level comment and all its replies.
        // Unlike per-message delete (author only), anyone with edit permission
        // can resolve. The comment's anchor mark is stripped so the text reads
        // as plain everywhere; the mark edit and the delete are grouped so one
        // undo reverses both.
        onResolve={
          entity_set.permissions.write
            ? async () => {
                if (!rep.rep) return;
                rep.undoManager.startGroup();
                try {
                  removeEditorCommentMark(props.blockID, props.commentEntityID);
                  await rep.rep.mutate.deleteEditorComment({
                    commentEntityID: props.commentEntityID,
                    blockID: props.blockID,
                  });
                } finally {
                  rep.undoManager.endGroup();
                }
              }
            : undefined
        }
      />
      {replies.length > 0 && (
        <div className="editor-comment-thread-replies flex flex-col gap-4">
          <hr className="border-border-light -mx-3" />
          {replies.map((r) => (
            <EditorCommentMessage
              key={r.data.value}
              entityID={r.data.value}
              onEditingChange={onMessageEditingChange}
              onDelete={async () => {
                // Deleting a reply retracts several facts; undo as one step
                rep.undoManager.startGroup();
                try {
                  await rep.rep?.mutate.deleteEditorCommentReply({
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

      {/* Drop the actions row entirely when empty so it doesn't leave a
          stray flex gap below the thread */}
      {!entity_set.permissions.write || editingMessages.size > 0 ? null : (
        <div className="editor-comment-thread-actions">
          {!identity?.atp_did ? (
            <EditorCommentLoginPrompt action="reply" />
          ) : (
            <div className="opaque-container p-1 w-full">
              <EditorCommentComposer
                placeholder="Reply..."
                submitLabel="Reply"
                autoFocus
                onSubmit={submitReply}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditorCommentMessage(props: {
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
      await rep.rep?.mutate.editEditorComment({
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
    "shrink-0 text-tertiary hover:text-accent-contrast opacity-100 xl:opacity-0 xl:group-hover/editor-comment-message:opacity-100 xl:focus:opacity-100";

  // The composer renders the same EditorCommentMessageLayout as the message, so
  // swapping one for the other doesn't shift the content around
  if (editing)
    return (
      <EditorCommentComposer
        autoFocus
        submitLabel="Save"
        initialContent={content?.data.value}
        onSubmit={submitEdit}
        onCancel={() => setEditing(false)}
      />
    );

  return (
    <EditorCommentMessageLayout
      did={authorDid}
      className="group/editor-comment-message"
      headerActions={
        <div className=" flex flex-row grow justify-between gap-3 items-center shrink-0">
          {createdAt && (
            <div className="text-xs text-tertiary shrink-0">
              {formatEditorCommentDate(createdAt.data.value)}
            </div>
          )}
          <div className="flex flex-row shrink-0 gap-1 items-center">
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
              <div className="-m-1 p-1">
                <ButtonPrimary
                  compact
                  className="shrink-0 text-xs ml-1 gap-1! hover:outline-transparent!  "
                  onClick={props.onResolve}
                  title="Resolve comment"
                >
                  Resolve <CheckTiny className="scale-80" />
                </ButtonPrimary>
              </div>
            )}
          </div>
        </div>
      }
    >
      <RenderYJSFragment value={content?.data.value || ""} wrapper="p" />
    </EditorCommentMessageLayout>
  );
}

function formatEditorCommentDate(value: string) {
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
