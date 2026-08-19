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
  changeMembership,
  type MyMembership,
} from "actions/memberships";
import { TierChangeConfirm } from "components/Memberships/TierChangeConfirm";
import { mutateMyMembership } from "components/Memberships/useMyMembership";
import { useMembershipTiers } from "components/Memberships/useMembershipTiers";
import {
  TierGrid,
  formatPrice,
  effectiveCadence,
  tierPriceLabel,
  type MembershipPlan,
  type Cadence,
} from "components/Memberships/TierGrid";
import type { GatePolicy } from "src/membership";

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
  onResume: () => void;
  onCancel?: () => void;
}) {
  const m = props.membership;

  if (!isMembershipActive(m.status)) return null;
  return (
    <>
      {m.cancelAtPeriodEnd ? (
        <ButtonPrimary
          className="text-sm"
          type="button"
          compact
          onClick={props.onResume}
        >
          Resume
        </ButtonPrimary>
      ) : (
        <>
          <ButtonPrimary
            className="text-sm"
            type="button"
            compact
            onClick={props.onChangePlan}
          >
            Change
          </ButtonPrimary>
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
  gatePolicy?: GatePolicy | null;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title={
        <h2 className="mx-auto text-center pb-2">
          {props.title ? props.title : "Change your membership"}
        </h2>
      }
      className="max-w-full w-fit bg-[var(--color-bg-light)]!"
      sheetOnMobile
    >
      <ChangePlanForm
        membership={props.membership}
        gatePolicy={props.gatePolicy}
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
  gatePolicy?: GatePolicy | null;
}) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();

  const { tiers } = useMembershipTiers(m.publication);
  const [cadence, setCadence] = useState<Cadence>(
    m.cadence === "year" ? "year" : "month",
  );
  const [confirmPlan, setConfirmPlan] = useState<MembershipPlan | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useModalBack(confirmPlan ? () => setConfirmPlan(null) : null);

  const finish = (detail: string) => {
    setConfirmPlan(null);
    setChanged(detail);
    mutateMyMembership(m.publication);
    refreshIdentityData();
    router.refresh();
  };

  const save = async (plan: Extract<MembershipPlan, { kind: "paid" }>) => {
    if (saving) return;
    setSaving(true);
    const res = await changeMembership({
      membershipId: m.id,
      tierId: plan.tier.id,
      cadence: effectiveCadence(plan.tier, cadence),
    });
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "Couldn't change plans. Please try again.",
      });
      return;
    }
    finish(
      `You're now on the ${plan.tier.name} plan, at ${tierPriceLabel(plan.tier, effectiveCadence(plan.tier, cadence))}.`,
    );
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

  if (changed)
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm mx-auto text-center justify-center">
        <div className="text-secondary leading-snug flex flex-col">
          <strong>Your membership has been updated!</strong>
          <p>{changed}</p>
        </div>
        <ButtonPrimary type="button" fullWidth onClick={props.onSuccess}>
          Close
        </ButtonPrimary>
      </div>
    );

  if (!tiers)
    return (
      <div className="flex justify-center py-8">
        <DotLoader />
      </div>
    );

  if (confirmPlan)
    return (
      <TierChangeConfirm
        membership={m}
        tiers={tiers}
        newPlan={confirmPlan}
        cadence={
          confirmPlan.kind === "paid"
            ? effectiveCadence(confirmPlan.tier, cadence)
            : "month"
        }
        busy={saving}
        onConfirm={() =>
          confirmPlan.kind === "subscriber" ? downgrade() : save(confirmPlan)
        }
        onClose={() => setConfirmPlan(null)}
      />
    );

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <TierGrid
        tiers={tiers}
        cadence={cadence}
        onCadenceChange={setCadence}
        busyPlan={null}
        currentMembership={{ kind: "paid", tierId: m.tierId }}
        gatePolicy={props.gatePolicy}
        onSelectPlan={setConfirmPlan}
      />
      <p className="tierPaymentInfo text-tertiary text-sm text-center">
        Changing plans prorates your bill.
      </p>
    </div>
  );
}
