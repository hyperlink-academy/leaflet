"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { CheckTiny } from "components/Icons/CheckTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { isOAuthSessionError, OAuthErrorMessage } from "components/OAuthError";
import { LinkHandle } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import type { ViewerUser } from "./viewerSubscription";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
  unsubscribeFromPublication,
} from "actions/publications/subscribeEmail";

const BLUESKY_FEED_URL =
  "https://bsky.app/profile/leaflet.pub/feed/subscribedPublications";

export const ManageSubscription = (props: {
  publicationUri: string;
  publicationUrl?: string;
  newsletterMode: boolean;
  user: ViewerUser;
}) => {
  const { user } = props;
  let [email, setEmail] = useState(user.email ?? "");
  let [linkEmailOpen, setLinkEmailOpen] = useState(false);
  let [linkRequesting, setLinkRequesting] = useState(false);
  let [linkConfirming, setLinkConfirming] = useState(false);
  let [unsubscribing, setUnsubscribing] = useState(false);
  let toaster = useToaster();
  let router = useRouter();
  let prefClassName =
    "flex gap-2 justify-between font-bold text-secondary items-center";

  const onRequestLink = async () => {
    if (linkRequesting || !email) return;
    setLinkRequesting(true);
    const res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
    );
    setLinkRequesting(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: (
          <div className="font-bold">
            {LINK_ERROR_MESSAGES[res.error] ?? "Couldn't link email."}
          </div>
        ),
      });
      return;
    }
    if (res.value.confirmed) {
      toaster({
        content: <div className="font-bold">Email Linked!</div>,
        type: "success",
      });
      setLinkEmailOpen(false);
      router.refresh();
      return;
    }
    setLinkEmailOpen(true);
  };

  const onConfirmLink = async (code: string) => {
    if (linkConfirming) return;
    setLinkConfirming(true);
    const res = await confirmPublicationEmailSubscription(
      props.publicationUri,
      email,
      code,
    );
    setLinkConfirming(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: (
          <div className="font-bold">
            {LINK_ERROR_MESSAGES[res.error] ?? "Couldn't confirm code."}
          </div>
        ),
      });
      return;
    }
    toaster({
      content: <div className="font-bold">Email Linked!</div>,
      type: "success",
    });
    setLinkEmailOpen(false);
    router.refresh();
  };

  const onUnsubscribe = async () => {
    if (unsubscribing) return;
    setUnsubscribing(true);
    const res = await unsubscribeFromPublication(props.publicationUri);
    setUnsubscribing(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: isOAuthSessionError(res.error) ? (
          <OAuthErrorMessage error={res.error} />
        ) : (
          <div className="font-bold">
            {UNSUBSCRIBE_ERROR_MESSAGES[res.error] ?? "Couldn't unsubscribe."}
          </div>
        ),
      });
      return;
    }
    toaster({
      content: <div className="font-bold">Unsubscribed.</div>,
      type: "success",
    });
    router.refresh();
  };

  return (
    <Modal
      title={
        <div className="text-secondary border-b border-border mb-2">
          Manage Subscription
        </div>
      }
      className="w-md max-w-full"
      trigger={
        <div className="manageSubPrefsTrigger flex gap-1 text-accent-contrast text-sm items-center ">
          <div className="font-bold flex gap-1 items-center">
            <CheckTiny /> Subscribed
          </div>
          <div className="underline">Manage</div>
        </div>
      }
    >
      <div className="manageSubPrefs flex flex-col gap-2">
        {props.newsletterMode && user.email ? (
          <div className={prefClassName}>
            <div className="flex flex-col leading-snug">
              <p>Linked Email</p>
              <p className="text-tertiary font-normal italic">{user.email}</p>
            </div>
          </div>
        ) : null}
        {user.handle && (
          <div className={prefClassName}>
            <div className="flex flex-col leading-snug">
              Linked Handle
              <p className="text-tertiary font-normal italic">{user.handle}</p>
            </div>
          </div>
        )}
        {props.publicationUrl && (
          <a
            href={`${props.publicationUrl}/rss`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${prefClassName} no-underline hover:text-accent-contrast`}
          >
            RSS Feed <GoToArrow className="text-accent-contrast" />
          </a>
        )}
        <a
          href={BLUESKY_FEED_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${prefClassName} no-underline hover:text-accent-contrast`}
        >
          Bluesky Feed
          <GoToArrow className="text-accent-contrast" />
        </a>

        {props.newsletterMode && !user.email ? (
          <div className="linkEmail accent-container p-4 text-sm flex flex-col gap-3 text-center justify-center">
            <div
              className={`text-secondary flex flex-col text-sm leading-snug`}
            >
              <h4 className={"text-sm"}>Link your email</h4>
              <div className="text-tertiary">
                to get updates right to your inbox!
              </div>
            </div>
            <EmailInput
              value={email}
              onChange={setEmail}
              loading={linkRequesting}
              action={
                <Modal
                  open={linkEmailOpen}
                  onOpenChange={setLinkEmailOpen}
                  trigger={
                    <ButtonPrimary
                      compact
                      disabled={linkRequesting || !email}
                      onClick={onRequestLink}
                      className="leading-tight! outline-none! text-sm!"
                    >
                      link
                    </ButtonPrimary>
                  }
                >
                  <EmailConfirm
                    emailValue={email}
                    autoFocus
                    loading={linkConfirming}
                    onBack={() => setLinkEmailOpen(false)}
                    onSubmit={onConfirmLink}
                  />
                </Modal>
              }
            />
          </div>
        ) : null}
        {!user.handle ? (
          <div className="accent-container p-4 text-sm">
            <LinkHandle compact />
          </div>
        ) : null}

        <hr className="border-border-light my-2" />
        <ButtonSecondary
          fullWidth
          disabled={unsubscribing}
          onClick={onUnsubscribe}
        >
          {unsubscribing ? "Unsubscribing…" : "Unsubscribe"}
        </ButtonSecondary>
      </div>
    </Modal>
  );
};

const LINK_ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  newsletter_disabled: "This publication isn't accepting email subscriptions.",
  email_send_failed: "We couldn't send the confirmation email. Try again.",
  subscriber_not_found: "No pending subscription. Start over.",
  invalid_code: "That code didn't match. Try again.",
  database_error: "Something went wrong. Try again.",
  suppressed_spam_complaint:
    "This address was previously marked as spam and can't be linked. Contact the publication to resolve.",
  suppression_delete_failed:
    "We couldn't clear a prior delivery issue on this address. Try again later.",
};

const UNSUBSCRIBE_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sign in to manage your subscription.",
  not_subscribed:
    "We couldn't find an email subscription for this publication.",
  database_error: "Something went wrong. Try again.",
};
