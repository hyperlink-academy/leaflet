"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  cancelMembership,
  resumeMembership,
  switchMembership,
  type MyMembership,
  type AvailableTier,
} from "actions/memberships";

export const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

export function membershipPrice(m: MyMembership): string | null {
  const cents = m.cadence === "year" ? m.annualPriceCents : m.monthlyPriceCents;
  if (cents == null) return null;
  return `${formatPrice(cents)}/${m.cadence === "year" ? "yr" : "mo"}`;
}

export function isMembershipActive(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

// Cancel/Resume and Change plan buttons for an active membership. Cancellation
// takes effect at the period's end, so "Cancel" flips to "Resume" while the
// membership is winding down. Cancelling goes through a confirm screen
// (CancelMembershipForm) via onCancel; resuming applies immediately.
export function MembershipActions(props: {
  membership: MyMembership;
  onSwitch: () => void;
  onCancel: () => void;
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
    router.refresh();
  };

  if (!isMembershipActive(m.status)) return null;
  return (
    <>
      {m.cancelAtPeriodEnd ? (
        <ButtonSecondary type="button" compact disabled={busy} onClick={resume}>
          {busy ? <DotLoader /> : "Resume"}
        </ButtonSecondary>
      ) : (
        <ButtonSecondary type="button" compact onClick={props.onCancel}>
          Cancel
        </ButtonSecondary>
      )}
      {m.availableTiers.length > 0 && (
        <ButtonSecondary type="button" compact onClick={props.onSwitch}>
          Change plan
        </ButtonSecondary>
      )}
    </>
  );
}

export function CancelMembershipModal(props: {
  membership: MyMembership;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Cancel membership"
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
    toaster({
      type: "success",
      content: "Membership will end at the period's end.",
    });
    props.onSuccess();
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-secondary leading-snug">
        Cancel your {m.tierName ? <strong>{m.tierName}</strong> : ""} membership
        to <strong>{m.publicationName ?? "this publication"}</strong>? You'll
        keep member access{" "}
        {m.currentPeriodEnd
          ? `until ${endDate}`
          : "until the end of your billing period"}
        , and you won't be charged again.
      </div>
      <div
        className={`flex ${props.onBack ? "justify-between" : "justify-end"}`}
      >
        {props.onBack && (
          <ButtonSecondary type="button" onClick={props.onBack}>
            Keep membership
          </ButtonSecondary>
        )}
        <ButtonPrimary type="button" disabled={busy} onClick={confirm}>
          {busy ? <DotLoader /> : "Cancel membership"}
        </ButtonPrimary>
      </div>
    </div>
  );
}

export function SwitchPlanModal(props: {
  membership: MyMembership;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Change plan"
      className="max-w-full w-sm"
    >
      <SwitchPlanForm membership={props.membership} onSuccess={props.onClose} />
    </Modal>
  );
}

export function SwitchPlanForm(props: {
  membership: MyMembership;
  onSuccess: () => void;
  onBack?: () => void;
}) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();
  const [tierId, setTierId] = useState(
    m.tierId ?? m.availableTiers[0]?.id ?? "",
  );
  const [cadence, setCadence] = useState<"month" | "year">(
    m.cadence === "year" ? "year" : "month",
  );
  const [saving, setSaving] = useState(false);

  const selectedTier = m.availableTiers.find((t) => t.id === tierId);
  const canAnnual = selectedTier?.annual_price_cents != null;
  const effectiveCadence = canAnnual ? cadence : "month";

  const save = async () => {
    if (saving || !tierId) return;
    setSaving(true);
    const res = await switchMembership({
      membershipId: m.id,
      tierId,
      cadence: effectiveCadence,
    });
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "Couldn't switch plans. Please try again.",
      });
      return;
    }
    toaster({ type: "success", content: "Plan updated." });
    props.onSuccess();
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {m.availableTiers.map((t: AvailableTier) => (
          <label
            key={t.id}
            className={`flex items-start gap-2 border rounded-md px-3 py-2 cursor-pointer ${
              tierId === t.id ? "border-accent-contrast" : "border-border-light"
            }`}
          >
            <input
              type="radio"
              name="tier"
              className="mt-1"
              checked={tierId === t.id}
              onChange={() => setTierId(t.id)}
            />
            <div className="flex flex-col">
              <div className="font-bold text-primary">{t.name}</div>
              <div className="text-secondary text-sm">
                {formatPrice(t.monthly_price_cents)}/mo
                {t.annual_price_cents != null &&
                  ` · ${formatPrice(t.annual_price_cents)}/yr`}
              </div>
            </div>
          </label>
        ))}
      </div>
      {canAnnual && (
        <div className="flex justify-center gap-1">
          {(["month", "year"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              className={`px-2 py-0.5 rounded-md text-sm font-bold ${
                effectiveCadence === c
                  ? "bg-accent-1 text-accent-2"
                  : "text-tertiary hover:text-primary"
              }`}
            >
              {c === "month" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
      )}
      <div className="text-tertiary text-sm leading-snug">
        Switching adjusts your next invoice with a prorated credit or charge.
      </div>
      <div
        className={`flex ${props.onBack ? "justify-between" : "justify-end"}`}
      >
        {props.onBack && (
          <ButtonSecondary type="button" onClick={props.onBack}>
            Back
          </ButtonSecondary>
        )}
        <ButtonPrimary
          type="button"
          disabled={saving || !tierId}
          onClick={save}
        >
          {saving ? <DotLoader /> : "Save"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
