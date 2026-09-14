"use client";
import dynamic from "next/dynamic";
import { useInteractionState, setInteractionState } from "../Interactions";
import { useIdentityData } from "components/IdentityProvider";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { BaseTextBlock } from "../../Blocks/BaseTextBlock";
import { useMemo, useState } from "react";
import { CollapsibleReplies } from "components/CollapsibleReplies";
import { CommentTiny } from "components/Icons/CommentTiny";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import { EditTiny } from "components/Icons/EditTiny";
import { Menu, MenuItem } from "components/Menu";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import { deleteComment } from "./commentAction";

import { AtUri } from "@atproto/api";
import { usePathname } from "next/navigation";
import { QuoteContent } from "../Quotes";
import { LoginModal } from "components/LoginButton";
import { type Profile } from "src/identity";
import { PostInfo } from "../../BskyPostContent";
import { Avatar } from "components/Avatar";
import { EmptyState } from "components/EmptyState";

export type Comment = {
  record: Json;
  uri: string;
  profile: Profile | null;
  // Tombstoned: `record` is stripped to subject/createdAt/onPage/reply and the
  // comment renders as a placeholder only while it still has visible replies.
  deleted?: boolean;
  edited?: boolean;
};

// Loaded when the comments drawer renders rather than bundled: the comment
// editor drags prosemirror into every public post page otherwise.
const CommentBox = dynamic(
  () => import("./CommentBox").then((m) => m.CommentBox),
  { ssr: false },
);
export function CommentsDrawerContent(props: {
  document_uri: string;
  comments: Comment[];
  noCommentBox?: boolean;
  pageId?: string;
}) {
  let { identity } = useIdentityData();
  let {
    localComments,
    deletedComments,
    editedComments,
    pageId: statePageId,
  } = useInteractionState(props.document_uri);
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
    ].map((c) => {
      if (deletedComments.includes(c.uri) && !c.deleted)
        return { ...c, deleted: true };
      if (editedComments[c.uri])
        return { ...c, record: editedComments[c.uri], edited: true };
      return c;
    });
  }, [props.comments, localComments, deletedComments, editedComments, pageId]);
  let topLevel = useMemo(
    () =>
      comments
        .filter(
          (comment) =>
            !(comment.record as PubLeafletComment.Record).reply &&
            isCommentShown(comment, comments),
        )
        .sort(byNewest),
    [comments],
  );
  let pathname = usePathname();
  let redirectRoute = useMemo(() => {
    if (typeof window === "undefined") return;
    let url = new URL(pathname, window.location.origin);
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
        {topLevel.length === 0 && <EmptyState>No comments yet…</EmptyState>}
        {topLevel.map((comment) => {
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

const byNewest = (a: Comment, b: Comment) =>
  new Date((b.record as PubLeafletComment.Record).createdAt).getTime() -
  new Date((a.record as PubLeafletComment.Record).createdAt).getTime();

// A deleted comment only earns a placeholder while something visible hangs
// off it; a deleted leaf (and a chain of deleted leaves) disappears outright.
function isCommentShown(comment: Comment, comments: Comment[]): boolean {
  if (!comment.deleted) return true;
  return comments.some(
    (c) =>
      (c.record as PubLeafletComment.Record).reply?.parent === comment.uri &&
      isCommentShown(c, comments),
  );
}

function getVisibleReplies(parentUri: string, comments: Comment[]) {
  return comments
    .filter(
      (comment) =>
        (comment.record as PubLeafletComment.Record).reply?.parent ===
          parentUri && isCommentShown(comment, comments),
    )
    .sort(byNewest);
}

const Comment = (props: {
  document: string;
  comment: Comment;
  comments: Comment[];
  profile: Profile | null;
  record: PubLeafletComment.Record;
  pageId?: string;
}) => {
  let { identity } = useIdentityData();
  let isAuthor =
    !!identity?.atp_did &&
    new AtUri(props.comment.uri).host === identity.atp_did;
  let [editing, setEditing] = useState(false);

  if (props.comment.deleted) {
    return (
      <div
        id={props.comment.uri}
        className="comment flex gap-2 pointer-events-auto"
      >
        <div className="h-6 w-6 shrink-0 rounded-full bg-border-light" />
        <div className="min-w-0 w-full grow flex flex-col pt-1">
          <div className="italic text-tertiary pb-[4px]">
            This comment has been deleted
          </div>
          <Replies
            pageId={props.pageId}
            comment_uri={props.comment.uri}
            comments={props.comments}
            document={props.document}
            canReply={false}
          />
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <PostInfo
            displayName={props.profile?.displayName}
            handle={props.profile?.handle || ""}
            createdAt={props.record.createdAt}
            compact
          />
          {props.comment.edited && (
            <span className="text-xs text-tertiary shrink-0">edited</span>
          )}
          {isAuthor && !editing && (
            <CommentOptions
              uri={props.comment.uri}
              document={props.document}
              onEdit={() => setEditing(true)}
            />
          )}
        </div>

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
        {editing ? (
          <CommentBox
            className="pt-1 pb-2"
            doc_uri={props.document}
            pageId={props.pageId}
            editing={{ uri: props.comment.uri, record: props.record }}
            autoFocus
            onCancel={() => setEditing(false)}
            onSubmit={() => setEditing(false)}
          />
        ) : (
          <pre
            key={props.comment.uri}
            style={{ wordBreak: "break-word", fontFamily: "inherit" }}
            className="whitespace-pre-wrap text-secondary pb-[4px] "
          >
            <BaseTextBlock
              index={[]}
              plaintext={props.record.plaintext}
              facets={props.record.facets}
              ugcLinks
            />
          </pre>
        )}
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
  canReply?: boolean;
}) => {
  let { identity } = useIdentityData();
  let canReply = props.canReply !== false && !!identity?.atp_did;

  let [replyBoxOpen, setReplyBoxOpen] = useState(false);
  let [repliesOpen, setRepliesOpen] = useState(true);

  let replies = getVisibleReplies(props.comment_uri, props.comments);

  return (
    <>
      <div className="flex gap-2 items-center">
        {(replies.length !== 0 || canReply) && (
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
        )}
        {canReply && (
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

const CommentOptions = (props: {
  uri: string;
  document: string;
  onEdit: () => void;
}) => {
  let [state, setState] = useState<"menu" | "confirm">("menu");
  let [loading, setLoading] = useState(false);
  let toaster = useToaster();

  return (
    <Menu
      asChild
      align="end"
      onOpenChange={(open) => {
        if (!open) setState("menu");
      }}
      trigger={
        <button
          className="shrink-0 text-tertiary hover:text-accent-contrast"
          aria-label="Comment options"
        >
          <MoreOptionsTiny />
        </button>
      }
    >
      {state === "menu" ? (
        <>
          <MenuItem onSelect={() => props.onEdit()}>
            <EditTiny />
            Edit Comment
          </MenuItem>
          <MenuItem
            onSelect={(e) => {
              e.preventDefault();
              setState("confirm");
            }}
          >
            <DeleteSmall />
            Delete Comment
          </MenuItem>
        </>
      ) : (
        <div className="flex flex-col justify-center p-2 text-center">
          <div className="text-primary font-bold">Delete this comment?</div>
          <div className="text-sm text-secondary">
            Replies to it will stay visible.
          </div>
          <div className="flex gap-2 mx-auto items-center mt-2">
            <ButtonTertiary onClick={() => setState("menu")}>
              Nevermind
            </ButtonTertiary>
            <ButtonPrimary
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                let result = await deleteComment({ uri: props.uri });
                setLoading(false);
                if (!result.success) {
                  toaster({
                    content: isOAuthSessionError(result.error) ? (
                      <OAuthErrorMessage error={result.error} />
                    ) : (
                      "We couldn't delete this. Please try again!"
                    ),
                    type: "error",
                  });
                  return;
                }
                setInteractionState(props.document, (s) => ({
                  deletedComments: [...s.deletedComments, props.uri],
                }));
              }}
            >
              Delete
            </ButtonPrimary>
          </div>
        </div>
      )}
    </Menu>
  );
};
