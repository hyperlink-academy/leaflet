"use client";
import { refreshIdentityData } from "components/IdentityProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { resumeMembership, type MyMembership } from "actions/memberships";
import { membershipPrice } from "components/Memberships/ChangePlanModal";
import { mutateMyMembership } from "components/Memberships/useMyMembership";

export function ResumeMembershipModal(props: {
  membership: MyMembership;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Resume Membership?"
      className="max-w-full w-sm text-center"
    >
      <ResumeMembershipForm
        membership={props.membership}
        onSuccess={props.onClose}
        onBack={props.onClose}
      />
    </Modal>
  );
}

export function ResumeMembershipForm(props: {
  membership: MyMembership;
  onSuccess: () => void;
  onBack?: () => void;
}) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [resumed, setResumed] = useState(false);
  const price = membershipPrice(m);
  const renewalDate = useLocalizedDate(m.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const renewal = m.currentPeriodEnd
    ? `on ${renewalDate}`
    : "at the end of your billing period";

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const res = await resumeMembership(m.id);
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: "Couldn't resume. Please try again." });
      return;
    }
    setResumed(true);
    mutateMyMembership(m.publication);
    refreshIdentityData();
    router.refresh();
  };

  if (resumed)
    return (
      <div className="flex flex-col gap-3 text-center justify-center">
        <div className="text-secondary leading-snug flex flex-col">
          <strong>Your membership has been resumed!</strong>
          <p>It will keep renewing {renewal}.</p>
        </div>
        <ButtonPrimary type="button" fullWidth onClick={props.onSuccess}>
          Close
        </ButtonPrimary>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto text-center">
      <div className="flex justify-center pt-2">
        <div className="accent-container w-fit py-0.5 px-2 font-bold text-accent-contrast border border-accent-contrast">
          {m.tierName ?? "Membership"}
          {price ? ` · ${price}` : ""}
        </div>
      </div>
      <div className="text-tertiary text-sm">
        Your membership will start renewing again {renewal}
      </div>
      <div className="flex gap-3 mx-auto">
        {props.onBack && (
          <ButtonTertiary type="button" onClick={props.onBack}>
            Nevermind
          </ButtonTertiary>
        )}
        <ButtonPrimary type="button" disabled={busy} onClick={confirm}>
          {busy ? <DotLoader /> : "Resume Membership"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
