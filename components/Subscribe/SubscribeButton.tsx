"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SubscribeWithHandle, AtSubscribeSuccess } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";
import { LinkIdentityModal } from "./LinkIdentityModal";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { ManageSubscription } from "./ManageSubscribe";
import { useToaster } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";
import { EmailTiny } from "components/Icons/EmailTiny";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";

import { useViewerSubscription } from "./viewerSubscription";
import { Separator } from "components/Layout";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";

type SubscribeMode = "email" | "atproto";

export type SubscribeProps = {
  autoFocus?: boolean;
  compact?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
};

export const SubscribePanel = (props: SubscribeProps) => {
  return (
    <div className=" w-full">
      <div className="accent-container rounded-lg! border-none! p-0! w-full text-center justify-center">
        <div className="px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
          <h3 className="leading-snug text-secondary">
            {props.publicationName}
          </h3>
          {props.publicationDescription && (
            <div className="text-tertiary">{props.publicationDescription}</div>
          )}
          <div className="w-fit max-w-full mx-auto pt-3">
            <SubscribeInput {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubscribeInput = (props: SubscribeProps) => {
  let toaster = useToaster();
  let router = useRouter();
  let pathname = usePathname();
  let searchParams = useSearchParams();
  const user = useViewerSubscription(props.publicationUri);
  const { identity, mutate: mutateIdentity } = useIdentityData();
  let [email, setEmail] = useState(user.email ?? "");
  let [confirmState, setConfirmState] = useState<"confirm" | "success">(
    "confirm",
  );
  let [confirmOpen, setConfirmOpen] = useState(false);
  let [requesting, setRequesting] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [locallySubscribed, setLocallySubscribed] = useState(false);
  let [linkModalOpen, setLinkModalOpen] = useState(false);
  let [subscribeMode, setSubscribeMode] = useState<SubscribeMode>("email");
  let [atSuccessOpen, setAtSuccessOpen] = useState(false);
  // Tracks that the user passed through LinkIdentityModal — when they enter
  // the confirmation code we attach the email to their current atp identity
  // (or merge from any existing email-only identity) instead of creating a
  // disconnected email-only account.
  let [linkToCurrent, setLinkToCurrent] = useState(false);

  const viewerHandle = identity?.bsky_profiles?.handle;
  const viewerAtpDid = identity?.atp_did;
  const viewerEmail = identity?.email;
  // The atp-only-but-subscribing-via-email case: signed in as a Bluesky
  // account with no email yet. The modal asks them to link the typed email
  // (or log out) before we send a confirmation code.
  const needsLinkConfirmation = !!viewerAtpDid && !viewerEmail && !!email;

  // Embedded subscribe forms (see /api/subscribe_email) redirect back here
  // with `subscribe_email=<email>` after sending the confirmation code. Open
  // the confirm modal so the user can paste the code from their inbox without
  // re-entering their email. `subscribe_email_confirmed=1` means the user was
  // already verified server-side and the modal jumps straight to success.
  useEffect(() => {
    if (!props.newsletterMode) return;
    const incomingEmail = searchParams.get("subscribe_email");
    const alreadyConfirmed =
      searchParams.get("subscribe_email_confirmed") === "1";
    const errorCode = searchParams.get("subscribe_email_error");
    if (!incomingEmail && !errorCode) return;

    if (errorCode) {
      const message =
        ERROR_MESSAGES[errorCode as SubscribeError] ??
        "We couldn't process that subscription. Try again.";
      toaster({ type: "error", content: message });
    } else if (incomingEmail) {
      setEmail(incomingEmail);
      setConfirmState(alreadyConfirmed ? "success" : "confirm");
      setConfirmOpen(true);
      if (alreadyConfirmed) {
        setLocallySubscribed(true);
        router.refresh();
      }
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("subscribe_email");
    next.delete("subscribe_email_confirmed");
    next.delete("subscribe_email_error");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.newsletterMode]);

  const sendRequest = async (link: boolean) => {
    setRequesting(true);
    setLinkToCurrent(link);
    let res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
    );
    setRequesting(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    if (res.value.confirmed) {
      setConfirmState("success");
      router.refresh();
    }
    setConfirmOpen(true);
  };

  const showManage = props.newsletterMode
    ? user.emailSubscribed
    : user.atprotoSubscribed;
  const isSubscribed = showManage || locallySubscribed;
  const modeMenu = (
    <SubscribeModeMenu mode={subscribeMode} onChange={setSubscribeMode} />
  );
  return (
    <>
      {!props.compact && <div className="h-1 w-full spacer" />}

      {isSubscribed ? (
        <>
          <ManageSubscription
            publicationUri={props.publicationUri}
            publicationUrl={props.publicationUrl}
            newsletterMode={props.newsletterMode}
            user={user}
          />

          {props.newsletterMode &&
          user.atprotoSubscribed &&
          !user.emailSubscribed ? (
            <div
              className="text-secondary  w-full text-sm p-2 pt-1.5 mt-1 rounded-md flex flex-col gap-1"
              style={{
                background:
                  "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 70%",
              }}
            >
              <div className="font-bold">Opt in to get updates via email!</div>
              <div className="max-w-sm w-full mx-auto">
                <EmailInput
                  publicationUrl={props.publicationUrl}
                  value={email}
                  onChange={setEmail}
                  disabled={user.loggedIn && !!user.email}
                  autoFocus={props.autoFocus}
                  compact={props.compact}
                  loading={requesting}
                  action={
                    <ButtonPrimary
                      compact
                      className="leading-tight! outline-none! text-sm!"
                      disabled={requesting || !email}
                      onClick={async () => {
                        if (requesting) return;
                        if (needsLinkConfirmation) {
                          setLinkModalOpen(true);
                          return;
                        }
                        await sendRequest(false);
                      }}
                    >
                      Get Emails
                    </ButtonPrimary>
                  }
                />
              </div>
            </div>
          ) : null}
        </>
      ) : props.newsletterMode ? (
        <div className="max-w-sm w-full mx-auto">
          {subscribeMode === "email" ? (
            <EmailInput
              publicationUrl={props.publicationUrl}
              value={email}
              onChange={setEmail}
              disabled={user.loggedIn && !!user.email}
              autoFocus={props.autoFocus}
              compact={props.compact}
              loading={requesting}
              leading={modeMenu}
              action={
                <ButtonPrimary
                  compact
                  className="leading-tight! outline-none! text-sm!"
                  onClick={async () => {
                    if (!email || requesting) return;
                    if (needsLinkConfirmation) {
                      setLinkModalOpen(true);
                      return;
                    }
                    await sendRequest(false);
                  }}
                >
                  Subscribe
                </ButtonPrimary>
              }
            />
          ) : (
            <SubscribeWithHandle
              user={user}
              autoFocus={props.autoFocus}
              compact={props.compact}
              publicationUri={props.publicationUri}
              publicationUrl={props.publicationUrl}
              onAtSuccess={() => setAtSuccessOpen(true)}
              leading={modeMenu}
            />
          )}
        </div>
      ) : (
        <SubscribeWithHandle
          user={user}
          autoFocus={props.autoFocus}
          compact={props.compact}
          publicationUri={props.publicationUri}
          publicationUrl={props.publicationUrl}
          onSubscribed={() => setLocallySubscribed(true)}
        />
      )}
      {props.newsletterMode && needsLinkConfirmation && (
        <LinkIdentityModal
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          signedInAs={
            viewerHandle ? `@${viewerHandle}` : "your Bluesky account"
          }
          linkingIdentity={email}
          confirmButtonLabel="Link email"
          confirming={requesting}
          onConfirm={async () => {
            setLinkModalOpen(false);
            await sendRequest(true);
          }}
        />
      )}
      {props.newsletterMode && (
        <>
          <Modal
            open={atSuccessOpen}
            onOpenChange={(open) => {
              setAtSuccessOpen(open);
              if (!open) {
                setLocallySubscribed(true);
                mutateIdentity();
                router.refresh();
              }
            }}
          >
            <AtSubscribeSuccess />
          </Modal>
          <Modal
            open={confirmOpen}
            onOpenChange={(open) => {
              setConfirmOpen(open);
              if (!open) {
                if (confirmState === "success") setLocallySubscribed(true);
                setConfirmState("confirm");
                setLinkToCurrent(false);
              }
            }}
          >
            {confirmState === "success" ? (
              <EmailSubscribeSuccess email={email} handle={user.handle} />
            ) : (
              <EmailConfirm
                autoFocus
                loading={confirming}
                onBack={() => setConfirmOpen(false)}
                emailValue={email}
                onSubmit={async (code) => {
                  if (confirming) return;
                  setConfirming(true);
                  let res = await confirmPublicationEmailSubscription(
                    props.publicationUri,
                    email,
                    code,
                    linkToCurrent,
                  );
                  setConfirming(false);
                  if (!res.ok) {
                    toaster({
                      type: "error",
                      content: ERROR_MESSAGES[res.error],
                    });
                    return;
                  }
                  setConfirmState("success");
                  router.refresh();
                }}
              />
            )}
          </Modal>
        </>
      )}
    </>
  );
};

const SubscribeModeMenu = (props: {
  mode: SubscribeMode;
  onChange: (mode: SubscribeMode) => void;
}) => {
  return (
    <div className="flex gap-1">
      <Menu
        align="start"
        asChild
        trigger={
          <button
            type="button"
            aria-label="Choose subscribe method"
            className="text-inherit  flex items-center gap-1"
          >
            {props.mode === "email" ? <EmailTiny /> : <AtmosphereAccount />}
            <ArrowDownTiny className="scale-90" />
          </button>
        }
      >
        <div className="text-tertiary text-sm px-1 pt-0.5 -mb-0.5">
          Subscribe via…
        </div>
        <RadioMenuGroup
          value={props.mode}
          onValueChange={(v) => props.onChange(v as SubscribeMode)}
        >
          <RadioMenuItem value="email" selected={props.mode === "email"}>
            <span className="flex items-center gap-2 shrink-0">
              <EmailTiny /> Email
            </span>
          </RadioMenuItem>
          <RadioMenuItem value="atproto" selected={props.mode === "atproto"}>
            <span className="flex items-center gap-2">
              <AtmosphereAccount /> Atmosphere
            </span>
          </RadioMenuItem>
        </RadioMenuGroup>
      </Menu>
      <Separator classname="h-5! " />
    </div>
  );
};

type SubscribeError =
  | "invalid_email"
  | "newsletter_disabled"
  | "email_send_failed"
  | "subscriber_not_found"
  | "invalid_code"
  | "database_error"
  | "suppressed_spam_complaint"
  | "suppression_delete_failed"
  | "link_invalid_state"
  | "email_belongs_to_other_account";

const ERROR_MESSAGES: Record<SubscribeError, string> = {
  invalid_email: "Please enter a valid email address.",
  newsletter_disabled: "This publication isn't accepting email subscriptions.",
  email_send_failed: "We couldn't send the confirmation email. Try again.",
  subscriber_not_found: "No pending subscription. Start over.",
  invalid_code: "That code didn't match. Try again.",
  database_error: "Something went wrong. Try again.",
  suppressed_spam_complaint:
    "This address was previously marked as spam and can't be resubscribed. Contact the publication to resolve.",
  suppression_delete_failed:
    "We couldn't clear a prior delivery issue on this address. Try again later.",
  link_invalid_state:
    "Couldn't link this email to your account. Try logging out and subscribing again.",
  email_belongs_to_other_account:
    "This email is already linked to a different Bluesky account. Log out to use that account instead.",
};
