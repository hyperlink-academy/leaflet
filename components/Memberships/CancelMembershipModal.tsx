"use client";
import { refreshIdentityData } from "components/IdentityProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { cancelMembership, type MyMembership } from "actions/memberships";
import { unsubscribeFromPublication } from "actions/publications/subscribeEmail";
import { mutateMyMembership } from "components/Memberships/useMyMembership";

export function CancelMembershipModal(props: {
  membership: MyMembership;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Cancel Membership?"
      className="max-w-full w-sm"
    >
      <CancelMembershipForm
        membership={props.membership}
        onSuccess={props.onClose}
        onBack={props.onClose}
      />
    </Modal>
  );
}

export function CancelMembershipForm(props: {
  membership: MyMembership;
  onSuccess: () => void;
  onBack?: () => void;
}) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const endDate = useLocalizedDate(m.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const res = await cancelMembership(m.id);
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: "Couldn't cancel. Please try again." });
      return;
    }
    setCanceled(true);
    mutateMyMembership(m.publication);
    refreshIdentityData();
    router.refresh();
  };

  const unsubscribe = async () => {
    if (busy) return;
    setBusy(true);
    const res = await unsubscribeFromPublication(m.publication, {
      cancelPaidImmediately: true,
    });
    setBusy(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "We couldn't unsubscribe you. Please try again!",
      });
      return;
    }
    toaster({ type: "success", content: "Unsubscribed!" });
    mutateMyMembership(m.publication);
    props.onSuccess();
    refreshIdentityData();
    router.refresh();
  };

  if (canceled)
    return (
      <div className="flex flex-col gap-3 text-center justify-center">
        <div className="text-secondary leading-snug flex flex-col gap-2">
          <strong>You&apos;ve cancelled your membership</strong>
          <p>
            You will continue to receive updates until{" "}
            <strong>
              {m.currentPeriodEnd ? endDate : "the end of your billing period"}
            </strong>
            . Click here to stop recieving updates
          </p>
        </div>
        <div className="flex gap-2 justify-between">
          <ButtonTertiary type="button" disabled={busy} onClick={unsubscribe}>
            {busy ? <DotLoader /> : "Unsubscribe"}
          </ButtonTertiary>
          <ButtonPrimary
            type="button"
            disabled={busy}
            onClick={props.onSuccess}
          >
            Close
          </ButtonPrimary>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-1 text-center text-secondary leading-snug">
      <div className="">
        Cancel your {m.tierName ? <strong>{m.tierName}</strong> : ""}{" "}
        membership?
      </div>
      <div>
        You'll keep member access{" "}
        {m.currentPeriodEnd
          ? `until ${endDate}`
          : "until the end of your billing period"}
      </div>

      <div className={`flex gap-3 pt-2 justify-center`}>
        {props.onBack && (
          <ButtonTertiary type="button" onClick={props.onBack}>
            Nevermind
          </ButtonTertiary>
        )}
        <ButtonPrimary type="button" disabled={busy} onClick={confirm}>
          {busy ? <DotLoader /> : "Cancel membership"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
