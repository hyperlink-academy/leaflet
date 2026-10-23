"use client";
import { useState } from "react";
import useSWR from "swr";
import { AtUri } from "@atproto/syntax";
import {
  getDocumentReplyTargets,
  getReplyTarget,
  withdrawReply,
  type ReplyError,
} from "actions/replies";
import { useActionToast } from "components/useActionToast";
import { PubIcon } from "components/ActionBar/Publications";
import { Avatar } from "components/Avatar";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { Menu, MenuItem } from "components/Menu";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { ProfilePopover } from "components/ProfilePopover";
import type { ReplyTarget } from "src/documentReplies";

// What published `document` has been submitted as a reply to, as the viewer
// may see it: pending submissions too, if it's theirs. Undefined until loaded
// or when `document` is null.
export function useDocumentReplyTargets(document: string | null | undefined) {
  return useSWR(document ? ["document_reply_targets", document] : null, () =>
    getDocumentReplyTargets(document!),
  ).data;
}

// What an editor draft replies to. Once published, that's what its document
// was actually submitted to; before, the post it was started from, which it'll
// be submitted to on first publish.
export function useDraftReplyTargets(
  linkedSubject: string | null | undefined,
  document: string | null | undefined,
): ReplyTarget[] {
  let submitted = useDocumentReplyTargets(document);
  let { data: linked } = useSWR(
    !document && linkedSubject ? ["reply_target", linkedSubject] : null,
    () => getReplyTarget(linkedSubject!),
  );
  if (document) return submitted ?? [];
  return linked ? [linked] : [];
}

const withdrawErrorMessages: Partial<Record<ReplyError["type"], string>> = {
  not_owner: "Only the author of the reply can withdraw it.",
};

// Deletes a submitted reply record, toasting on failure; resolves whether it
// worked.
export function useWithdrawReply() {
  let run = useActionToast<ReplyError>(withdrawErrorMessages);
  return async (replyUri: string) =>
    !!(await run(() => withdrawReply(replyUri)));
}

// Marks a post, draft or published, as a reply to others: one row per post it
// replies to, each linking to that post.
export function ReplyingTo(props: {
  targets: ReplyTarget[];
  // From the editor, so following the link doesn't leave the draft
  newTab?: boolean;
  // Only passed when the viewer can withdraw; resolves whether it worked
  onWithdraw?: (target: ReplyTarget) => Promise<boolean>;
  className?: string;
}) {
  let [withdrawn, setWithdrawn] = useState<string[]>([]);
  let targets = props.targets.filter((t) => !withdrawn.includes(t.uri));
  if (targets.length === 0) return null;
  let onWithdraw = props.onWithdraw;
  return (
    <div className={`replyingTo flex flex-col gap-2 ${props.className ?? ""}`}>
      {targets.map((target) => (
        <div
          key={target.uri}
          className="light-container w-full px-3 py-2 text-sm text-secondary flex items-center gap-2"
        >
          {/* The post and its author truncate to keep the row on one line;
              on mobile there's only room for the post. */}
          <div className="grow flex items-center gap-1 min-w-0">
            <span className="shrink-0 pr-0.5">In reply to</span>
            <a
              href={target.href}
              target={props.newTab ? "_blank" : undefined}
              className="flex items-center gap-1 min-w-0 font-bold text-accent-contrast"
            >
              {target.publication ? (
                <PubIcon
                  tiny
                  icon={target.publication.icon ?? undefined}
                  pubName={target.publication.name}
                />
              ) : (
                target.authorAvatar && (
                  <Avatar
                    size="tiny"
                    src={target.authorAvatar}
                    displayName={target.authorHandle}
                  />
                )
              )}
              <span className="truncate">{target.title}</span>
            </a>
            {target.authorHandle && (
              <div className="hidden sm:flex items-center gap-1 min-w-0">
                <span className="shrink-0">by</span>
                <ProfilePopover
                  didOrHandle={new AtUri(target.uri).host}
                  triggerClassName="truncate hover:underline"
                  trigger={`@${target.authorHandle}`}
                />
              </div>
            )}
          </div>
          {target.pending && (
            <span className="shrink-0 italic text-tertiary">Pending</span>
          )}
          {onWithdraw && (
            <ReplyTargetOptions
              title={target.title}
              onWithdraw={async () => {
                let ok = await onWithdraw(target).catch(() => false);
                if (ok) setWithdrawn((w) => [...w, target.uri]);
                return ok;
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ReplyTargetOptions(props: {
  title: string;
  onWithdraw: () => Promise<boolean>;
}) {
  let [open, setOpen] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [withdrawing, setWithdrawing] = useState(false);
  return (
    <Menu
      asChild
      align="end"
      open={open}
      onOpenChange={(o) => {
        if (withdrawing) return;
        setOpen(o);
        setConfirming(false);
      }}
      trigger={
        <button
          type="button"
          aria-label="Reply options"
          className="shrink-0 text-tertiary hover:text-accent-contrast"
        >
          <MoreOptionsVerticalTiny />
        </button>
      }
    >
      {confirming ? (
        <div className="flex flex-col justify-center p-2 text-center max-w-64">
          <div className="text-primary font-bold">Are you sure?</div>
          <div className="text-sm text-secondary">
            This post will no longer be a reply to <em>{props.title}</em>.
          </div>
          <div className="flex gap-2 mx-auto items-center mt-2">
            <ButtonTertiary
              compact
              className="text-sm"
              disabled={withdrawing}
              onClick={() => setConfirming(false)}
            >
              Nevermind
            </ButtonTertiary>
            <ButtonPrimary
              compact
              className="text-sm"
              disabled={withdrawing}
              onClick={async () => {
                setWithdrawing(true);
                let ok = await props.onWithdraw();
                setWithdrawing(false);
                if (ok) setOpen(false);
              }}
            >
              {withdrawing ? (
                <LoadingTiny className="animate-spin" />
              ) : (
                "Yes, withdraw"
              )}
            </ButtonPrimary>
          </div>
        </div>
      ) : (
        <MenuItem
          onSelect={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
        >
          Withdraw reply
        </MenuItem>
      )}
    </Menu>
  );
}
