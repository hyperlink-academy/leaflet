"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary } from "components/Buttons";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { EmailInput, EmailConfirm } from "components/Subscribe/EmailSubscribe";
import {
  SubscribeWithHandle,
  AtSubscribeSuccess,
} from "components/Subscribe/HandleSubscribe";
import { LinkIdentityModal } from "components/Subscribe/LinkIdentityModal";
import { SUBSCRIBE_ERROR_MESSAGES } from "components/Subscribe/subscribeErrors";
import { redirectToEmailSubscribe } from "components/Subscribe/SubscribeButton";
import {
  requestPublicationEmailSubscription,
  confirmPublicationEmailSubscription,
} from "actions/publications/subscribeEmail";

// The subscribe step of the membership join flow: collect the reader's email
export function MembershipSubscribe(props: {
  publicationUri: string;
  newsletterMode: boolean;
  loggedIn: boolean;
  email?: string | null;
  handle?: string | null;
  onSubscribed: () => void;
}) {
  const toaster = useToaster();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [atSuccessOpen, setAtSuccessOpen] = useState(false);

  if (!props.newsletterMode) {
    return (
      <>
        <SubscribeWithHandle
          autoFocus
          publicationUri={props.publicationUri}
          subscribeLabel="Next"
          // We're already in the join flow — don't bounce to /join; show the
          // success modal in place and continue via onSubscribed on close.
          skipJoinRedirect
          user={{
            loggedIn: props.loggedIn,
            email: props.email ?? undefined,
            handle: props.handle ?? undefined,
          }}
          onAtSuccess={() => setAtSuccessOpen(true)}
        />
        <Modal
          open={atSuccessOpen}
          onOpenChange={(open) => {
            setAtSuccessOpen(open);
            if (!open) props.onSubscribed();
          }}
        >
          <AtSubscribeSuccess />
        </Modal>
      </>
    );
  }

  // A logged-in reader here is signed in with an atproto identity but no email
  // yet, so we confirm they want to link the typed email to that account before
  // sending the code. A logged-out reader goes through main-site email login,
  // which returns them here already subscribed.
  const needsLink = props.loggedIn;

  const sendRequest = async () => {
    setRequesting(true);
    const res = await requestPublicationEmailSubscription(
      props.publicationUri,
      email,
    );
    setRequesting(false);
    if (!res.ok) {
      toaster({ type: "error", content: SUBSCRIBE_ERROR_MESSAGES[res.error] });
      return;
    }
    if (res.value.confirmed) {
      props.onSubscribed();
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <EmailInput
        autoFocus
        value={email}
        onChange={setEmail}
        loading={requesting}
        onSubmit={() => {
          if (!email || requesting) return;
          if (needsLink) setLinkModalOpen(true);
          else redirectToEmailSubscribe(email, props.publicationUri);
        }}
        action={
          <ButtonPrimary
            type="submit"
            compact
            className="leading-tight! outline-none! text-sm!"
            disabled={requesting || !email}
          >
            Next
          </ButtonPrimary>
        }
      />
      {needsLink && (
        <LinkIdentityModal
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          signedInAs={
            props.handle ? `@${props.handle}` : "your Bluesky account"
          }
          linkingIdentity={email}
          confirmButtonLabel="Link email"
          confirming={requesting}
          onConfirm={async () => {
            setLinkModalOpen(false);
            await sendRequest();
          }}
        />
      )}
      <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
        <EmailConfirm
          autoFocus
          loading={confirming}
          emailValue={email}
          onBack={() => setConfirmOpen(false)}
          onSubmit={async (code) => {
            if (confirming) return;
            setConfirming(true);
            const res = await confirmPublicationEmailSubscription(
              props.publicationUri,
              email,
              code,
              true,
            );
            setConfirming(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content: SUBSCRIBE_ERROR_MESSAGES[res.error],
              });
              return;
            }
            router.refresh();
            props.onSubscribed();
          }}
        />
      </Modal>
    </>
  );
}
