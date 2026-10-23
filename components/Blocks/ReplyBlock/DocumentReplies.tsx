"use client";
import React, { useState } from "react";
import useSWR from "swr";
import { ButtonPrimary } from "components/Buttons";
import { Modal } from "components/Modal";
import { LoginModal } from "components/LoginButton";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { useIdentityData } from "components/IdentityProvider";
import { useActionToast } from "components/useActionToast";
import { useToaster } from "components/Toast";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";
import { mainSiteAuthBase } from "src/utils/customDomain";
import {
  createReplyDraft,
  getDocumentReplies,
  getReplyCandidates,
  rejectReply,
  resolveReplyLink,
  setReplyVisible,
  submitReply,
  withdrawReply,
  type ReplyError,
} from "actions/replies";
import type {
  DocumentReply,
  DocumentReplies as DocumentRepliesData,
} from "src/documentReplies";
import { useDocumentEvents } from "src/documentEvents/useDocumentEvents";
import { isDocumentOwner } from "src/utils/isDocumentOwner";
import { DEFAULT_REPLY_BUTTON_TEXT } from "./constants";
import { RepliesList, RepliesListWithModeration } from "./RepliesList";
import { ReplyPicker, type ReplyCandidate } from "./ReplyPicker";
import { Err, Ok, type OkValue } from "src/result";

const replyErrorMessages: Partial<Record<ReplyError["type"], string>> = {
  not_found: "Hmmm… We couldn't find that post.",
  not_your_post:
    "Looks like you don't own this post! Replies must be your own posts.",
  same_post: "A post can't reply to itself.",
  already_submitted: "This post was already submitted.",
  replies_closed: "This post isn't taking replies.",
};

// Replies to a published document
export function DocumentReplies(props: {
  documentUri: string;
  block: string | null;
  initialReplies?: DocumentReply[];
  initial?: DocumentRepliesData;
  buttonText?: string;
  showThemes?: boolean;
  prompt?: React.ReactNode;
  action?: React.ReactNode;
}) {
  let { identity, identityPending } = useIdentityData();
  let viewer = identity?.atp_did ?? null;
  let [changed, setChanged] = useState(false);
  let needsFetch =
    !identityPending && (!!viewer || !props.initialReplies || changed);
  let { data: allReplies, mutate } = useSWR(
    needsFetch ? ["document_replies", props.documentUri, viewer] : null,
    () => getDocumentReplies(props.documentUri),
    {
      fallbackData:
        props.initial ??
        (props.initialReplies && {
          isAuthor: false,
          replies: props.initialReplies,
        }),
    },
  );
  let data = allReplies && {
    ...allReplies,
    replies: allReplies.replies.filter((r) => r.block === props.block),
  };
  useDocumentEvents(props.documentUri, ["reply", "reply_visibility"], () => {
    setChanged(true);
    mutate();
  });
  let [busy, setBusy] = useState(false);
  let run = useActionToast<ReplyError>(replyErrorMessages);
  let toaster = useToaster();
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
  let inEditor = props.action !== undefined;
  let ownsDocument = !!viewer && isDocumentOwner(props.documentUri, viewer);
  if (inEditor || ownsDocument) {
    let loaded = inEditor || data?.isAuthor ? data : undefined;
    let controls = props.action ?? (
      <ReplyButton
        label={label}
        documentUri={props.documentUri}
        block={props.block}
        onSubmitted={() => mutate()}
      />
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

    let accept = async (reply: string) => {
      setBusy(true);
      let ok = await run(() =>
        setReplyVisible({ subject: props.documentUri, reply, visible: true }),
      );
      if (ok)
        await mutate(
          (current) =>
            current && {
              ...current,
              replies: current.replies.map((r) =>
                r.uri === reply ? { ...r, visible: true } : r,
              ),
            },
          { revalidate: false },
        );
      setBusy(false);
    };
    let reject = async (reply: string) => {
      setBusy(true);
      let ok = await run(() =>
        rejectReply({ subject: props.documentUri, reply }),
      );
      if (ok) {
        await mutate(
          (current) =>
            current && {
              ...current,
              replies: current.replies.filter((r) => r.uri !== reply),
            },
          { revalidate: false },
        );
        toaster({ content: "Reply was removed", type: "success" });
      }
      setBusy(false);
    };
    return (
      <RepliesListWithModeration
        replies={loaded.replies}
        showThemes={props.showThemes}
        prompt={props.prompt}
        busy={busy}
        onAccept={accept}
        onReject={reject}
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
          <ButtonPrimary disabled className={ACTION_CLASS}>
            <span className="truncate">{label}</span>
          </ButtonPrimary>
        ) : viewer ? (
          <ReplyButton
            label={label}
            documentUri={props.documentUri}
            block={props.block}
            onSubmitted={() => mutate()}
          />
        ) : (
          <LoginModal
            asChild
            noEmailLogin
            trigger={
              <ButtonPrimary className={ACTION_CLASS}>
                <span className="truncate">{label}</span>
              </ButtonPrimary>
            }
          />
        )
      }
    />
  );
}

const ACTION_CLASS = "max-w-full min-w-0";

function ReplyButton(props: {
  label: string;
  documentUri: string;
  block: string | null;
  onSubmitted: () => void;
}) {
  let [open, setOpen] = useState(false);
  return (
    <Modal
      asChild
      sheetOnMobile
      open={open}
      onOpenChange={setOpen}
      trigger={
        <ButtonPrimary className={ACTION_CLASS}>
          <span className="truncate">{props.label}</span>
        </ButtonPrimary>
      }
    >
      <ReplyPickerForViewer
        documentUri={props.documentUri}
        block={props.block}
        onSubmitted={() => {
          setOpen(false);
          props.onSubmitted();
        }}
      />
    </Modal>
  );
}

function ReplyPickerForViewer(props: {
  documentUri: string;
  block: string | null;
  onSubmitted: () => void;
}) {
  let { identity } = useIdentityData();
  let { data, mutate } = useSWR(
    ["reply_candidates", identity?.atp_did, props.documentUri],
    () => getReplyCandidates(props.documentUri),
  );
  let [submitting, setSubmitting] = useState(false);
  let run = useActionToast<ReplyError>(replyErrorMessages);
  return (
    <ReplyPicker
      publications={data?.publications}
      onCreateDraft={async (publication_uri) => {
        let result = await run(() =>
          createReplyDraft({
            subject: props.documentUri,
            block: props.block,
            publication_uri,
          }),
        );
        if (!result) return;
        window.location.assign(`${mainSiteAuthBase()}/${result.value.leaflet}`);
      }}
      candidates={(data?.candidates ?? [])
        .filter((c) => c.uri !== props.documentUri)
        .map(toReplyCandidate)}
      resolveLink={async (url) => {
        let result = await resolveReplyLink({
          subject: props.documentUri,
          url,
        });
        if (result.ok) return Ok(toReplyCandidate(result.value));
        return Err(
          replyErrorMessages[result.error.type] ??
            "We couldn't find that post.",
        );
      }}
      submitting={submitting}
      onSubmit={async (document) => {
        setSubmitting(true);
        let ok = await run(() =>
          submitReply({
            subject: props.documentUri,
            block: props.block,
            document,
          }),
        );
        setSubmitting(false);
        if (!ok) return;
        mutate();
        props.onSubmitted();
      }}
    />
  );
}

function toReplyCandidate(
  c: OkValue<Awaited<ReturnType<typeof resolveReplyLink>>>,
): ReplyCandidate {
  return {
    uri: c.uri,
    title: c.title,
    submitted: c.submitted,
    date: c.publishedAt ? (
      <LocalizedDate
        dateString={c.publishedAt}
        omitYear
        options={{ year: "2-digit", month: "short", day: "numeric" }}
      />
    ) : undefined,
    publication: c.publicationName ? { name: c.publicationName } : undefined,
  };
}
