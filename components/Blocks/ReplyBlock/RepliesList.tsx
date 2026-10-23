"use client";
import React, { useState } from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Popover } from "components/Popover";
import { CloseTiny } from "components/Icons/CloseTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { Separator } from "components/Layout";
import { DotLoader } from "components/utils/DotLoader";
import { StandardSitePostItemView } from "components/Blocks/StandardSitePostBlock/StandardSitePostItem";
import { PublicationThemeWrapper } from "components/ThemeManager/PublicationThemeProvider";
import type { DocumentReply } from "src/documentReplies";
import { hasSeveralAuthors } from "../InteractionAuthorName";
import {
  AcceptedRepliesHeader,
  PendingRepliesHeader,
  RepliesDivider,
  RepliesHeader,
} from "./RepliesHeader";

export function RepliesList(props: {
  replies: DocumentReply[];
  showThemes?: boolean;
  prompt?: React.ReactNode;
  action?: React.ReactNode;
  onWithdraw?: (uri: string) => void;
}) {
  let { onWithdraw } = props;
  let showHandles = repliersDiffer(props.replies);
  let myPending = props.replies.filter((r) => r.mine && !r.visible);
  let accepted = [
    ...props.replies.filter((r) => r.mine && r.visible),
    ...props.replies.filter((r) => !r.mine),
  ];
  let row = (reply: DocumentReply) => (
    <ReplyRow
      key={reply.uri}
      reply={reply}
      showTheme={props.showThemes}
      showHandle={showHandles}
      control={
        reply.mine &&
        onWithdraw && (
          <button
            aria-label="Withdraw reply"
            className="text-tertiary hover:text-accent-contrast shrink-0  text-sm "
            onClick={() => onWithdraw(reply.uri)}
          >
            Withdraw
          </button>
        )
      }
    />
  );
  return (
    <div className="flex flex-col gap-4">
      <RepliesHeader prompt={props.prompt} action={props.action} />
      {props.replies.length > 0 && (
        <>
          {myPending.length > 0 && (
            <div className="flex flex-col gap-2">
              <RepliesDivider label={`Pending (${myPending.length})`} />
              {myPending.map(row)}
            </div>
          )}
          {accepted.length > 0 && (
            <>
              <hr />
              <div className="flex flex-col gap-2">{accepted.map(row)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// The author's view: visible replies and, in a collapsible section above
// them, the pending ones. Either can be removed.
export function RepliesListWithModeration(props: {
  replies: DocumentReply[];
  showThemes?: boolean;
  busy?: boolean;
  onAccept: (uri: string) => void;
  onReject: (uri: string) => Promise<void>;
  onWithdraw: (uri: string) => void;
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  let pending = props.replies.filter((r) => !r.visible);
  let visible = props.replies.filter((r) => r.visible);
  let showHandles = repliersDiffer(props.replies);
  let [pendingOpen, setPendingOpen] = useState(true);
  let withdraw = (reply: DocumentReply) =>
    reply.mine && (
      <button
        aria-label="Withdraw reply"
        className="hover:text-accent-contrast"
        disabled={props.busy}
        onClick={() => props.onWithdraw(reply.uri)}
      >
        <CloseTiny />
      </button>
    );
  return (
    <div className="flex flex-col gap-4">
      <RepliesHeader prompt={props.prompt} action={props.action} />
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <PendingRepliesHeader
            pending={pending.length}
            open={pendingOpen}
            onToggle={() => setPendingOpen(!pendingOpen)}
          />
          {pendingOpen && (
            <>
              {pending.map((reply) => (
                <ReplyRow
                  key={reply.uri}
                  reply={reply}
                  showTheme={props.showThemes}
                  showHandle={showHandles}
                  control={
                    <>
                      <RejectReplyButton
                        disabled={props.busy}
                        onReject={() => props.onReject(reply.uri)}
                      />
                      <Separator classname="h-4!" />
                      <button
                        className="text-sm shrink-0 flex flex-row gap-2 items-center font-bold text-accent-contrast"
                        disabled={props.busy}
                        onClick={() => props.onAccept(reply.uri)}
                      >
                        Accept <CheckTiny />
                      </button>
                      {withdraw(reply)}
                    </>
                  }
                />
              ))}
            </>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex flex-col gap-2">
          <AcceptedRepliesHeader accepted={visible.length} />
          {visible.map((reply) => (
            <ReplyRow
              key={reply.uri}
              reply={reply}
              showTheme={props.showThemes}
              showHandle={showHandles}
              control={
                <>
                  <RejectReplyButton
                    disabled={props.busy}
                    onReject={() => props.onReject(reply.uri)}
                  />
                  {withdraw(reply)}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RepliesEmptyDraft(props: {
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <RepliesHeader prompt={props.prompt} action={props.action} />
      <div className="opaque-container text-sm italic text-tertiary text-center p-3 sm:p-4">
        <div className="text-base font-bold">
          Replies will open when you publish this post.
        </div>
        Here, readers can submit their own posts as replies to this post.
        Replies are shown on your published post once you approve them.
      </div>
    </div>
  );
}

function ReplyRow(props: {
  reply: DocumentReply;
  showTheme?: boolean;
  showHandle?: boolean;
  control?: React.ReactNode;
}) {
  return (
    <div
      className={`replyPostRow relative flex flex-col gap-0.5 ${props.control && "mt-[10px]"}`}
    >
      <div className="transparent-container overflow-hidden">
        <ReplyPost post={props.reply.post} showTheme={props.showTheme} />
      </div>
      {props.control && (
        <div className=" absolute right-2 -top-[10px] opaque-container z-10 shrink-0 flex items-center gap-2 text-tertiary place-items-end px-1.5">
          {props.control}
        </div>
      )}
    </div>
  );
}

const repliersDiffer = (replies: DocumentReply[]) =>
  hasSeveralAuthors(replies.map((r) => r.replier));

function RejectReplyButton(props: {
  disabled?: boolean;
  onReject: () => Promise<void>;
}) {
  let [open, setOpen] = useState(false);
  let [rejecting, setRejecting] = useState(false);
  return (
    <Popover
      asChild
      align="end"
      open={open}
      onOpenChange={setOpen}
      disabled={props.disabled}
      trigger={
        <button
          className="text-sm text-tertiary hover:text-accent-contrast"
          disabled={props.disabled}
        >
          Remove
        </button>
      }
    >
      <div className="flex flex-col justify-center p-2 text-center max-w-64">
        <div className="text-primary font-bold">Are you sure?</div>

        <div className="flex gap-2 mx-auto items-center mt-2">
          <ButtonTertiary
            className="text-sm"
            compact
            onClick={() => setOpen(false)}
          >
            Nevermind
          </ButtonTertiary>
          <ButtonPrimary
            compact
            className="text-sm"
            disabled={rejecting}
            onClick={async () => {
              setRejecting(true);
              await props.onReject();
              setRejecting(false);
              setOpen(false);
            }}
          >
            {rejecting ? <DotLoader /> : "Yes, remove"}
          </ButtonPrimary>
        </div>
      </div>
    </Popover>
  );
}

function ReplyPost(props: {
  post: DocumentReply["post"];
  showTheme?: boolean;
}) {
  return (
    <PublicationThemeWrapper
      postRecord={props.post.record}
      pubRecord={props.post.publication?.record ?? undefined}
      enabled={!!props.showTheme}
    >
      <div className={props.showTheme ? "bg-bg-page" : ""}>
        <StandardSitePostItemView post={props.post} size="small" />
      </div>
    </PublicationThemeWrapper>
  );
}
