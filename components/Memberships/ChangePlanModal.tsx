"use client";
import { refreshIdentityData } from "components/IdentityProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal, useModalBack } from "components/Modal";
import { useToaster } from "components/Toast";
import {
  changeMembershipToFree,
  resumeMembership,
  changeMembership,
  type MyMembership,
} from "actions/memberships";
import { TierChangeConfirm } from "components/Memberships/TierChangeConfirm";
import { useJoinableTiers } from "components/Memberships/useJoinableTiers";
import {
  TierGrid,
  formatPrice,
  isFreeTier,
  effectiveCadence,
  type Tier,
  type Cadence,
} from "components/Memberships/TierGrid";

export function membershipPrice(m: MyMembership): string | null {
  const cents = m.cadence === "year" ? m.annualPriceCents : m.monthlyPriceCents;
  if (cents == null) return null;
  return `${formatPrice(cents)}/${m.cadence === "year" ? "yr" : "mo"}`;
}

export function isMembershipActive(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

export function MembershipActions(props: {
  membership: MyMembership;
  onChangePlan: () => void;
  onCancel?: () => void;
  onChanged?: () => void;
}) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const resume = async () => {
    if (busy) return;
    setBusy(true);
    const res = await resumeMembership(m.id);
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: "Couldn't resume. Please try again." });
      return;
    }
    toaster({ type: "success", content: "Membership resumed." });
    props.onChanged?.();
    refreshIdentityData();
    router.refresh();
  };

  if (!isMembershipActive(m.status)) return null;
  return (
    <>
      {m.cancelAtPeriodEnd ? (
        <ButtonPrimary
          className="text-sm"
          type="button"
          compact
          disabled={busy}
          onClick={resume}
        >
          {busy ? <DotLoader /> : "Resume"}
        </ButtonPrimary>
      ) : (
        <>
          {m.availableTiers.length > 0 && (
            <ButtonPrimary
              className="text-sm"
              type="button"
              compact
              onClick={props.onChangePlan}
            >
              Change
            </ButtonPrimary>
          )}
          {props.onCancel && (
            <ButtonSecondary
              className="text-sm"
              type="button"
              compact
              onClick={props.onCancel}
            >
              Cancel
            </ButtonSecondary>
          )}
        </>
      )}
    </>
  );
}

export function ChangePlanModal(props: {
  membership: MyMembership;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  unlocksPost?: boolean;
  unlocksPostTierIds?: string[] | null;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title=<h2 className="mx-auto text-center pb-2">
        {props.title ? props.title : "Change your membership"}
      </h2>
      className="max-w-full w-fit bg-[var(--color-bg-light)]!"
      sheetOnMobile
    >
      <ChangePlanForm
        membership={props.membership}
        unlocksPost={props.unlocksPost}
        unlocksPostTierIds={props.unlocksPostTierIds}
        onSuccess={() => {
          props.onSuccess?.();
          props.onClose();
        }}
      />
    </Modal>
  );
}

export function ChangePlanForm(props: {
  membership: MyMembership;
  onSuccess: () => void;
  unlocksPost?: boolean;
  unlocksPostTierIds?: string[] | null;
}) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();

  const { tiers } = useJoinableTiers(m.publication);
  const [cadence, setCadence] = useState<Cadence>(
    m.cadence === "year" ? "year" : "month",
  );
  const [confirmTier, setConfirmTier] = useState<Tier | null>(null);
  const [saving, setSaving] = useState(false);
  useModalBack(confirmTier ? () => setConfirmTier(null) : null);

  const finish = (message: string) => {
    toaster({ type: "success", content: message });
    setConfirmTier(null);
    props.onSuccess();
    refreshIdentityData();
    router.refresh();
  };

  const save = async (tier: Tier) => {
    if (saving) return;
    setSaving(true);
    const res = await changeMembership({
      membershipId: m.id,
      tierId: tier.id,
      cadence: effectiveCadence(tier, cadence),
    });
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "Couldn't change plans. Please try again.",
      });
      return;
    }
    finish("Plan updated.");
  };

  const downgrade = async () => {
    if (saving) return;
    setSaving(true);
    const res = await changeMembershipToFree({
      membershipId: m.id,
      publicationUri: m.publication,
    });
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "We couldn't downgrade your plan. Please try again!",
      });
      return;
    }
    finish(
      res.value.subscribed
        ? "You'll move to the free plan at the end of your billing period."
        : "Your membership expires at the end of your billing period.",
    );
  };

  if (!tiers)
    return (
      <div className="flex justify-center py-8">
        <DotLoader />
      </div>
    );

  if (confirmTier)
    return (
      <TierChangeConfirm
        membership={m}
        tiers={tiers}
        newTier={confirmTier}
        cadence={effectiveCadence(confirmTier, cadence)}
        busy={saving}
        onConfirm={() =>
          isFreeTier(confirmTier) ? downgrade() : save(confirmTier)
        }
        onClose={() => setConfirmTier(null)}
      />
    );

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      {tiers.length > 0 ? (
        <>
          <TierGrid
            tiers={tiers}
            cadence={cadence}
            onCadenceChange={setCadence}
            busyTierId={null}
            isSubscribed
            currentTierId={m.tierId}
            unlocksPost={props.unlocksPost}
            unlocksPostTierIds={props.unlocksPostTierIds}
            onSelectTier={setConfirmTier}
          />
          <p className="tierPaymentInfo text-tertiary text-sm text-center">
            Changing plans prorates your bill.
          </p>
        </>
      ) : (
        <p className="text-tertiary text-sm text-center py-4 italic">
          This publication doesn't have any other plans right now.
        </p>
      )}
    </div>
  );
}
