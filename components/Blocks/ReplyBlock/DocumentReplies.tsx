"use client";
import React, { useState } from "react";
import useSWR from "swr";
import { ButtonPrimary } from "components/Buttons";
import { Popover } from "components/Popover";
import { LoginModal } from "components/LoginButton";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { useIdentityData } from "components/IdentityProvider";
import { useToaster } from "components/Toast";
import { actionErrorContent } from "components/OAuthError";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import {
  getDocumentReplies,
  getReplyCandidates,
  setReplyVisible,
  submitReply,
  withdrawReply,
  type ReplyError,
} from "actions/replies";
import { DEFAULT_REPLY_BUTTON_TEXT } from "./constants";
import { RepliesList, RepliesModeration, ReplyPicker } from "./RepliesView";

const replyErrorMessages: Partial<Record<ReplyError["type"], string>> = {
  not_found: "We couldn't find that post. Is it published?",
  not_your_post: "You can only reply with your own posts.",
  same_post: "A post can't reply to itself.",
  replies_closed: "This post isn't taking replies.",
};

// Runs a reply action and toasts its failure, thrown or returned.
function useReplyAction() {
  let toaster = useToaster();
  return async <T,>(
    action: () => Promise<
      { ok: true; value: T } | { ok: false; error: ReplyError }
    >,
  ) => {
    let error: ReplyError;
    try {
      let result = await action();
      if (result.ok) return true;
      error = result.error;
    } catch {
      error = { type: "failed" };
    }
    toaster({
      content: actionErrorContent(
        error,
        replyErrorMessages[error.type] ?? "Oh no! Something went wrong!",
      ),
      type: "error",
    });
    return false;
  };
}

// Replies to a published document, for whoever is looking: the document's
// author moderates them, everyone else reads the visible ones and can submit
// their own. `action` replaces the reader's reply button (the editor passes
// its editable label).
export function DocumentReplies(props: {
  documentUri: string;
  buttonText?: string;
  showThemes?: boolean;
  action?: React.ReactNode;
}) {
  let { identity, identityPending } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  let { data, mutate } = useSWR(
    identityPending ? null : ["document_replies", props.documentUri, viewer],
    () => getDocumentReplies(props.documentUri),
  );
  let [busy, setBusy] = useState(false);
  let run = useReplyAction();

  // Until the viewer's role is known there's no telling which controls to
  // show.
  if (!data) return <RepliesList replies={[]} action={props.action} />;

  if (data.isAuthor) {
    let setVisible = async (reply: string, visible: boolean) => {
      setBusy(true);
      let ok = await run(() =>
        setReplyVisible({ subject: props.documentUri, reply, visible }),
      );
      if (ok)
        await mutate(
          (current) =>
            current && {
              ...current,
              replies: current.replies.map((r) =>
                r.uri === reply ? { ...r, visible } : r,
              ),
            },
          { revalidate: false },
        );
      setBusy(false);
    };
    return (
      <RepliesModeration
        replies={data.replies}
        showThemes={props.showThemes}
        busy={busy}
        onAccept={(uri) => setVisible(uri, true)}
        onHide={(uri) => setVisible(uri, false)}
        action={props.action}
      />
    );
  }

  let label = props.buttonText || DEFAULT_REPLY_BUTTON_TEXT;
  return (
    <RepliesList
      replies={data.replies}
      showThemes={props.showThemes}
      onWithdraw={async (uri) => {
        if (await run(() => withdrawReply(uri)))
          await mutate(
            (current) =>
              current && {
                ...current,
                replies: current.replies.filter((r) => r.uri !== uri),
              },
            { revalidate: false },
          );
      }}
      action={
        props.action !== undefined ? (
          props.action
        ) : viewer ? (
          <ReplyButton
            label={label}
            documentUri={props.documentUri}
            onSubmitted={() => mutate()}
          />
        ) : (
          <LoginModal
            asChild
            noEmailLogin
            trigger={
              <ButtonPrimary>
                <BlueskyTiny /> {label}
              </ButtonPrimary>
            }
          />
        )
      }
    />
  );
}

function ReplyButton(props: {
  label: string;
  documentUri: string;
  onSubmitted: () => void;
}) {
  let [open, setOpen] = useState(false);
  return (
    <Popover
      asChild
      align="end"
      open={open}
      onOpenChange={setOpen}
      trigger={<ButtonPrimary>{props.label}</ButtonPrimary>}
    >
      <ReplyPickerForViewer
        documentUri={props.documentUri}
        onSubmitted={() => {
          setOpen(false);
          props.onSubmitted();
        }}
      />
    </Popover>
  );
}

function ReplyPickerForViewer(props: {
  documentUri: string;
  onSubmitted: () => void;
}) {
  let { identity } = useIdentityData();
  let { data: candidates } = useSWR(
    ["reply_candidates", identity?.atp_did],
    () => getReplyCandidates(),
  );
  let [submitting, setSubmitting] = useState(false);
  let run = useReplyAction();
  return (
    <ReplyPicker
      candidates={(candidates ?? [])
        .filter((c) => c.uri !== props.documentUri)
        .map((c) => ({
          uri: c.uri,
          title: c.title,
          date: c.publishedAt ? (
            <LocalizedDate
              dateString={c.publishedAt}
              omitYear
              options={{ year: "2-digit", month: "short", day: "numeric" }}
            />
          ) : undefined,
          publication: c.publicationName
            ? { name: c.publicationName }
            : undefined,
        }))}
      submitting={submitting}
      onSubmit={async (reply) => {
        setSubmitting(true);
        let ok = await run(() =>
          submitReply({ subject: props.documentUri, reply }),
        );
        setSubmitting(false);
        if (ok) props.onSubmitted();
      }}
    />
  );
}
