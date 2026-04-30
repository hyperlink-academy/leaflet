"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubscribeWithHandle } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";
import { LinkIdentityModal } from "./LinkIdentityModal";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { ManageSubscription } from "./ManageSubscribe";
import { useToaster } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";

import { useViewerSubscription } from "./viewerSubscription";

export type SubscribeProps = {
  autoFocus?: boolean;
  publicationUri: string;
  publicationUrl?: string;
  publicationName: string;
  publicationDescription?: string;
  newsletterMode: boolean;
};

export const SubscribePanel = (props: SubscribeProps) => {
  return (
    <div className="px-3 sm:px-4 w-full">
      <div className="accent-container rounded-lg! w-full px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5 text-center justify-center">
        <h3 className="leading-snug text-secondary">{props.publicationName}</h3>
        {props.publicationDescription && (
          <div className="text-tertiary pb-1">
            {props.publicationDescription}
          </div>
        )}

        <div className="mx-auto">
          <SubscribeInput {...props} />
        </div>
      </div>
    </div>
  );
};

export const SubscribeButton = (props: SubscribeProps) => {
  const user = useViewerSubscription(props.publicationUri);
  const showManage = props.newsletterMode
    ? user.emailSubscribed
    : user.atprotoSubscribed;
  return (
    <Modal
      className="px-0! py-3! sm:py-4! w-[1000px] sm:max-w-md max-w-full"
      asChild
      trigger={
        showManage ? (
          <ManageSubscription
            publicationUri={props.publicationUri}
            publicationUrl={props.publicationUrl}
            newsletterMode={props.newsletterMode}
            user={user}
          />
        ) : (
          <ButtonPrimary compact className="text-sm">
            Subscribe
          </ButtonPrimary>
        )
      }
    >
      <SubscribePanel {...props} autoFocus />
    </Modal>
  );
};

export const SubscribeInput = (props: SubscribeProps) => {
  let toaster = useToaster();
  let router = useRouter();
  const user = useViewerSubscription(props.publicationUri);
  const { identity } = useIdentityData();
  let [email, setEmail] = useState(user.email ?? "");
  let [confirmState, setConfirmState] = useState<"confirm" | "success">(
    "confirm",
  );
  let [confirmOpen, setConfirmOpen] = useState(false);
  let [requesting, setRequesting] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [locallySubscribed, setLocallySubscribed] = useState(false);
  let [linkModalOpen, setLinkModalOpen] = useState(false);
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
  return (
    <>
      <div className="h-1 w-full spacer" />

      {isSubscribed ? (
        <>
          <ManageSubscription
            publicationUri={props.publicationUri}
            publicationUrl={props.publicationUrl}
            newsletterMode={props.newsletterMode}
            user={user}
          />

          {/*{props.newsletterMode &&
          user.atprotoSubscribed &&
          !user.emailSubscribed ? (*/}
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
                value={email}
                onChange={setEmail}
                disabled={user.loggedIn && !!user.email}
                autoFocus={props.autoFocus}
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
          {/*) : null}*/}
        </>
      ) : props.newsletterMode ? (
        <div className="max-w-sm w-full mx-auto">
          <EmailInput
            value={email}
            onChange={setEmail}
            disabled={user.loggedIn && !!user.email}
            autoFocus={props.autoFocus}
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
                Subscribe
              </ButtonPrimary>
            }
          />
        </div>
      ) : (
        <SubscribeWithHandle
          user={user}
          autoFocus={props.autoFocus}
          publicationUri={props.publicationUri}
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
      )}
    </>
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
