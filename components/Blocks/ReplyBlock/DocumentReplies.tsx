"use client";
import React, { useState } from "react";
import useSWR from "swr";
import { ButtonPrimary } from "components/Buttons";
import { Popover } from "components/Popover";
import { LoginModal } from "components/LoginButton";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { useIdentityData } from "components/IdentityProvider";
import { useActionToast } from "components/useActionToast";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import {
  getDocumentReplies,
  getReplyCandidates,
  setReplyVisible,
  submitReply,
  withdrawReply,
  type ReplyError,
} from "actions/replies";
import type { DocumentReply } from "src/documentReplies";
import { useDocumentEvents } from "src/documentEvents/useDocumentEvents";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import { DEFAULT_REPLY_BUTTON_TEXT } from "./constants";
import {
  PendingRepliesToggle,
  RepliesList,
  RepliesModeration,
  ReplyPicker,
} from "./RepliesView";

const replyErrorMessages: Partial<Record<ReplyError["type"], string>> = {
  not_found: "We couldn't find that post. Is it published?",
  not_your_post: "You can only reply with your own posts.",
  same_post: "A post can't reply to itself.",
  replies_closed: "This post isn't taking replies.",
};

// Replies to a published document, for whoever is looking: the document's
// author moderates them, everyone else reads the visible ones and can submit
// their own. `action` replaces the reader's reply button (the editor passes
// its editable label). `initialReplies` is the public list a cached page was
// rendered with; a signed-in viewer's own view (moderation, pending
// submissions) replaces it once their identity is known.
export function DocumentReplies(props: {
  documentUri: string;
  initialReplies?: DocumentReply[];
  buttonText?: string;
  showThemes?: boolean;
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  let { identity, identityPending } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  // An anonymous reader of a cached page has nothing to add to the public
  // list it was rendered with, until something happens to it.
  let [changed, setChanged] = useState(false);
  let needsFetch =
    !identityPending && (!!viewer || !props.initialReplies || changed);
  let { data, mutate } = useSWR(
    needsFetch ? ["document_replies", props.documentUri, viewer] : null,
    () => getDocumentReplies(props.documentUri),
    {
      fallbackData: props.initialReplies && {
        isAuthor: false,
        replies: props.initialReplies,
      },
    },
  );
  useDocumentEvents(props.documentUri, ["reply", "reply_visibility"], () => {
    setChanged(true);
    mutate();
  });
  let [busy, setBusy] = useState(false);
  let [open, setOpen] = useState(false);
  let run = useActionToast<ReplyError>(replyErrorMessages);
  let withdraw = async (uri: string) => {
    if (await run(() => withdrawReply(uri)))
      await mutate(
        (current) =>
          current && {
            ...current,
            replies: current.replies.filter((r) => r.uri !== uri),
          },
        { revalidate: false },
      );
  };

  let label = props.buttonText || DEFAULT_REPLY_BUTTON_TEXT;
  // The editor and the document's owner keep the reply button (the author can
  // reply with a post of their own) and get a toggle for the replies still
  // waiting on them.
  let inEditor = props.action !== undefined;
  let ownsDocument = !!viewer && isDocumentOwner(props.documentUri, viewer);
  if (inEditor || ownsDocument) {
    // On a published page `data` starts as the public list the page was
    // rendered with, which isn't the owner's view of their replies.
    let loaded = inEditor || data?.isAuthor ? data : undefined;
    let pending = loaded?.isAuthor
      ? loaded.replies.filter((r) => !r.visible).length
      : 0;
    // Once the last pending reply is dealt with the toggle goes away; the
    // next one to arrive should start closed.
    if (open && pending === 0) setOpen(false);
    let controls = (
      <>
        {props.action ?? (
          <ReplyButton
            label={label}
            documentUri={props.documentUri}
            onSubmitted={() => mutate()}
          />
        )}
        <PendingRepliesToggle
          pending={pending}
          open={open}
          onToggle={() => setOpen(!open)}
        />
      </>
    );
    if (!loaded || !loaded.isAuthor)
      return (
        <RepliesList
          replies={
            loaded
              ? loaded.replies
              : inEditor
                ? []
                : data?.replies.filter((r) => r.visible) ?? []
          }
          showThemes={props.showThemes}
          prompt={props.prompt}
          onWithdraw={withdraw}
          action={controls}
        />
      );

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
        replies={loaded.replies}
        showThemes={props.showThemes}
        showPending={open}
        prompt={props.prompt}
        busy={busy}
        onAccept={(uri) => setVisible(uri, true)}
        onHide={(uri) => setVisible(uri, false)}
        onWithdraw={withdraw}
        action={controls}
      />
    );
  }
  if (!data) return null;

  return (
    <RepliesList
      replies={data.replies}
      showThemes={props.showThemes}
      prompt={props.prompt}
      onWithdraw={withdraw}
      action={
        identityPending ? (
          <ButtonPrimary disabled>{label}</ButtonPrimary>
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
  let run = useActionToast<ReplyError>(replyErrorMessages);
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
