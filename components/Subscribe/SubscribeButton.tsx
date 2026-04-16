"use client";
import { useState } from "react";
import { SubscribeWithHandle } from "./HandleSubscribe";
import { EmailInput, EmailConfirm } from "./EmailSubscribe";
import { EmailSubscribeSuccess } from "./EmailSubscribeSuccess";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { PostPubInfo } from "app/lish/[did]/[publication]/[rkey]/PostPubInfo";
import { ManageSubscription } from "./ManageSubscribe";

export const SubscribeButton = (props: {
  autoFocus?: boolean;
  newsletterMode: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
    subscribed: boolean;
  };
}) => {
  return (
    <Modal
      className="px-0! py-3! sm:py-4! w-[1000px] sm:max-w-md max-w-full"
      asChild
      trigger={
        props.user.subscribed ? (
          <ManageSubscription {...props} />
        ) : (
          <ButtonPrimary compact className="text-sm">
            Subscribe
          </ButtonPrimary>
        )
      }
    >
      <PostPubInfo autoFocus {...props} />
    </Modal>
  );
};

export const SubscribeInput = (props: {
  autoFocus?: boolean;
  newsletterMode: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
    subscribed: boolean;
  };
}) => {
  let [email, setEmail] = useState(props.user?.email ?? "");
  let [confirmState, setConfirmState] = useState<"confirm" | "success">(
    "confirm",
  );

  if (props.user.subscribed) {
    return <ManageSubscription {...props} />;
  }
  if (props.newsletterMode) {
    return (
      <EmailInput
        value={email}
        onChange={setEmail}
        disabled={props.user?.loggedIn}
        autoFocus={props.autoFocus}
        action={
          <Modal
            trigger={
              <ButtonPrimary
                compact
                className="leading-tight! outline-none! text-sm!"
              >
                Subscribe
              </ButtonPrimary>
            }
          >
            {confirmState === "success" ? (
              <EmailSubscribeSuccess
                email={props.user?.email}
                handle={props.user?.handle}
              />
            ) : (
              <EmailConfirm
                emailValue={email}
                onSubmit={() => setConfirmState("success")}
              />
            )}
          </Modal>
        }
      />
    );
  } else
    return (
      <SubscribeWithHandle user={props.user} autoFocus={props.autoFocus} />
    );
};
