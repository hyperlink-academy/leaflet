"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubscribeWithHandle } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { ManageSubscription } from "./ManageSubscribe";
import { useToaster } from "components/Toast";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";

import { useViewerSubscription } from "./viewerSubscription";

export type SubscribeProps = {
  autoFocus?: boolean;
  publicationUri: string;
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
          <div className="text-tertiary pb-3">
            {props.publicationDescription}
          </div>
        )}

        <div className="max-w-sm mx-auto ">
          <SubscribeInput {...props} />
        </div>
      </div>
    </div>
  );
};

export const SubscribeButton = (props: SubscribeProps) => {
  const user = useViewerSubscription(props.publicationUri);
  return (
    <Modal
      className="px-0! py-3! sm:py-4! w-[1000px] sm:max-w-md max-w-full"
      asChild
      trigger={
        user.subscribed ? (
          <ManageSubscription
            publicationUri={props.publicationUri}
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
  let [email, setEmail] = useState(user.email ?? "");
  let [confirmState, setConfirmState] = useState<"confirm" | "success">(
    "confirm",
  );
  let [confirmOpen, setConfirmOpen] = useState(false);
  let [requesting, setRequesting] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [locallySubscribed, setLocallySubscribed] = useState(false);

  const isSubscribed = user.subscribed || locallySubscribed;
  return (
    <>
      {isSubscribed ? (
        <ManageSubscription
          publicationUri={props.publicationUri}
          newsletterMode={props.newsletterMode}
          user={user}
        />
      ) : props.newsletterMode ? (
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
                setRequesting(true);
                let res = await requestPublicationEmailSubscription(
                  props.publicationUri,
                  email,
                );
                setRequesting(false);
                if (!res.ok) {
                  toaster({
                    type: "error",
                    content: ERROR_MESSAGES[res.error],
                  });
                  return;
                }
                if (res.value.confirmed) {
                  setConfirmState("success");
                  router.refresh();
                }
                setConfirmOpen(true);
              }}
            >
              Subscribe
            </ButtonPrimary>
          }
        />
      ) : (
        <SubscribeWithHandle user={user} autoFocus={props.autoFocus} />
      )}
      {props.newsletterMode && (
        <Modal
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) {
              if (confirmState === "success") setLocallySubscribed(true);
              setConfirmState("confirm");
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
  | "database_error";

const ERROR_MESSAGES: Record<SubscribeError, string> = {
  invalid_email: "Please enter a valid email address.",
  newsletter_disabled: "This publication isn't accepting email subscriptions.",
  email_send_failed: "We couldn't send the confirmation email. Try again.",
  subscriber_not_found: "No pending subscription. Start over.",
  invalid_code: "That code didn't match. Try again.",
  database_error: "Something went wrong. Try again.",
};
