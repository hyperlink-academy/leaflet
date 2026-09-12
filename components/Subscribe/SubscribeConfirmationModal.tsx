"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import dynamic from "next/dynamic";
import {
  SUBSCRIBE_ERROR_MESSAGES as ERROR_MESSAGES,
  type SubscribeError,
} from "./subscribeErrors";
import { replaceWithoutParams } from "src/utils/replaceWithoutParams";

// Only reachable through a subscribe redirect, so the success screens (and the
// subscribe buttons and membership flow they reach) load with the modal.
// Sized placeholder so the modal opens at roughly the success screen's height
// instead of as an empty box; this modal is reached by a post-OAuth redirect,
// when the client bundle is always cold.
const successLoading = () => <div className="w-sm max-w-full h-64" />;
const AtSubscribeSuccess = dynamic(
  () => import("./SubscribeSuccess").then((m) => m.AtSubscribeSuccess),
  { loading: successLoading },
);
const EmailSubscribeSuccess = dynamic(
  () => import("./SubscribeSuccess").then((m) => m.EmailSubscribeSuccess),
  { loading: successLoading },
);

export function SubscribeConfirmationModal() {
  let router = useRouter();
  let pathname = usePathname();
  let searchParams = useSearchParams();
  let toaster = useToaster();
  let { identity, mutate: mutateIdentity } = useIdentityData();
  let [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  let [atSuccess, setAtSuccess] = useState(false);
  let [subscribedPub, setSubscribedPub] = useState<string | null>(null);

  useEffect(() => {
    let incomingEmail = searchParams.get("subscribe_email");
    let emailError = searchParams.get("subscribe_email_error");
    let showAtSuccess = searchParams.get("showSubscribeSuccess") === "true";
    let atError = searchParams.get("showSubscribeError") === "true";
    let incomingSubscribedPub = searchParams.get("subscribed_pub");
    if (!incomingEmail && !emailError && !showAtSuccess && !atError) return;

    replaceWithoutParams(router, pathname, searchParams, [
      "subscribe_email",
      "subscribe_email_error",
      "showSubscribeSuccess",
      "showSubscribeError",
      "subscribed_pub",
    ]);

    setSubscribedPub(incomingSubscribedPub);

    if (emailError) {
      toaster({
        type: "error",
        content:
          ERROR_MESSAGES[emailError as SubscribeError] ??
          "We couldn't process that subscription. Try again.",
      });
    } else if (incomingEmail) {
      setEmailSuccess(incomingEmail);
    } else if (showAtSuccess) {
      setAtSuccess(true);
    } else if (atError) {
      toaster({
        type: "error",
        content: "Subscription failed, please try again.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  let handle = identity?.bsky_profiles?.handle ?? undefined;
  return (
    <>
      <Modal
        open={atSuccess}
        onOpenChange={(open) => {
          if (open) return;
          setAtSuccess(false);
          mutateIdentity();
          router.refresh();
        }}
      >
        <AtSubscribeSuccess publicationUri={subscribedPub ?? undefined} />
      </Modal>
      <Modal
        open={!!emailSuccess}
        onOpenChange={(open) => {
          if (open) return;
          setEmailSuccess(null);
          mutateIdentity();
          router.refresh();
        }}
      >
        <EmailSubscribeSuccess
          email={emailSuccess ?? undefined}
          handle={handle}
          publicationUri={subscribedPub ?? undefined}
        />
      </Modal>
    </>
  );
}
