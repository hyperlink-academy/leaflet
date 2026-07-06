"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useToaster } from "components/Toast";
import { SpeedyLink } from "components/SpeedyLink";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  cancelMembership,
  resumeMembership,
  switchMembership,
  updateWalletCard,
  type MyMembership,
  type MyMembershipsData,
  type AvailableTier,
} from "actions/memberships";
import { createWalletCheckoutSession } from "actions/publications/joinMembership";

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

function membershipPrice(m: MyMembership): string | null {
  const cents =
    m.cadence === "year" ? m.annualPriceCents : m.monthlyPriceCents;
  if (cents == null) return null;
  return `${formatPrice(cents)}/${m.cadence === "year" ? "yr" : "mo"}`;
}

function isActive(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

export function MembershipsManager(props: { initial: MyMembershipsData }) {
  const { memberships, wallet } = props.initial;
  const toaster = useToaster();
  const router = useRouter();
  const [processingReturn, setProcessingReturn] = useState(false);

  // Returning from the hosted setup page after updating the card: save + re-clone
  // to every membership, drop the marker, and refresh.
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get(
      "wallet_session",
    );
    if (!sessionId) return;
    setProcessingReturn(true);
    updateWalletCard(sessionId).then((res) => {
      window.history.replaceState(null, "", window.location.pathname);
      setProcessingReturn(false);
      if (!res.ok) {
        toaster({
          type: "error",
          content: "We couldn't update your card. Please try again!",
        });
        return;
      }
      if (res.value.failedPublications.length > 0) {
        toaster({
          type: "error",
          content:
            "Card saved, but it couldn't be applied to some memberships. Please retry.",
        });
      } else {
        toaster({ type: "success", content: "Card updated." });
      }
      router.refresh();
    });
  }, []);

  return (
    <div className="max-w-prose w-full flex flex-col gap-4">
      <h1 className="sm:text-xl text-lg">Memberships &amp; billing</h1>

      <WalletCardSection wallet={wallet} processing={processingReturn} />

      <div className="flex flex-col gap-3">
        <h2 className="text-base text-secondary font-bold">Your memberships</h2>
        {memberships.length === 0 ? (
          <div className="opaque-container px-4 py-6 text-center text-secondary">
            You're not a paying member of any publication yet.
          </div>
        ) : (
          memberships.map((m) => <MembershipRow key={m.id} membership={m} />)
        )}
      </div>
    </div>
  );
}

function WalletCardSection(props: {
  wallet: MyMembershipsData["wallet"];
  processing: boolean;
}) {
  const toaster = useToaster();
  const [redirecting, setRedirecting] = useState(false);
  const card = props.wallet;

  const openCardForm = async () => {
    if (redirecting) return;
    setRedirecting(true);
    const res = await createWalletCheckoutSession({
      returnUrl: window.location.origin + "/memberships",
    });
    if (!res.ok) {
      setRedirecting(false);
      toaster({
        type: "error",
        content: "We couldn't open the card form. Please try again!",
      });
      return;
    }
    window.location.href = res.value.url;
  };

  return (
    <div className="opaque-container px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex flex-col">
        <div className="text-secondary font-bold">Payment card</div>
        {props.processing ? (
          <div className="text-tertiary text-sm">Updating…</div>
        ) : card?.card_last4 ? (
          <div className="text-secondary text-sm">
            {(card.card_brand ?? "Card").replace(/^\w/, (c) => c.toUpperCase())}{" "}
            ···{card.card_last4}
            {card.card_exp_month && card.card_exp_year
              ? ` · expires ${String(card.card_exp_month).padStart(2, "0")}/${String(
                  card.card_exp_year,
                ).slice(-2)}`
              : ""}
          </div>
        ) : (
          <div className="text-tertiary text-sm">No card on file yet.</div>
        )}
      </div>
      <ButtonSecondary
        type="button"
        disabled={redirecting || props.processing}
        onClick={openCardForm}
      >
        {redirecting ? (
          <DotLoader />
        ) : card?.card_last4 ? (
          "Update card"
        ) : (
          "Add card"
        )}
      </ButtonSecondary>
    </div>
  );
}

function MembershipRow(props: { membership: MyMembership }) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const renewal = useLocalizedDate(m.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const price = membershipPrice(m);

  const statusLabel = m.cancelAtPeriodEnd
    ? "Canceling"
    : m.status === "past_due"
      ? "Payment failed"
      : isActive(m.status)
        ? "Active"
        : m.status === "incomplete"
          ? "Pending"
          : (m.status ?? "Inactive");

  const doCancel = async () => {
    if (busy) return;
    setBusy(true);
    const res = await cancelMembership(m.id);
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: "Couldn't cancel. Please try again." });
      return;
    }
    toaster({ type: "success", content: "Membership will end at the period's end." });
    router.refresh();
  };

  const doResume = async () => {
    if (busy) return;
    setBusy(true);
    const res = await resumeMembership(m.id);
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: "Couldn't resume. Please try again." });
      return;
    }
    toaster({ type: "success", content: "Membership resumed." });
    router.refresh();
  };

  return (
    <div className="opaque-container px-4 py-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <SpeedyLink
          href={m.publicationUrl}
          className="text-primary font-bold no-underline! hover:underline!"
        >
          {m.publicationName ?? m.publication}
        </SpeedyLink>
        <span className="text-sm text-tertiary shrink-0">{statusLabel}</span>
      </div>
      <div className="text-secondary text-sm">
        {m.tierName ?? "Membership"}
        {price ? ` · ${price}` : ""}
      </div>
      {m.currentPeriodEnd && (
        <div className="text-tertiary text-sm">
          {m.cancelAtPeriodEnd ? "Ends" : "Renews"} {renewal}
        </div>
      )}
      <div className="flex gap-2 flex-wrap pt-1">
        {isActive(m.status) &&
          (m.cancelAtPeriodEnd ? (
            <ButtonSecondary type="button" compact disabled={busy} onClick={doResume}>
              {busy ? <DotLoader /> : "Resume"}
            </ButtonSecondary>
          ) : (
            <ButtonSecondary type="button" compact disabled={busy} onClick={doCancel}>
              {busy ? <DotLoader /> : "Cancel"}
            </ButtonSecondary>
          ))}
        {isActive(m.status) && m.availableTiers.length > 0 && (
          <ButtonSecondary
            type="button"
            compact
            onClick={() => setSwitching(true)}
          >
            Change plan
          </ButtonSecondary>
        )}
      </div>
      {switching && (
        <SwitchPlanModal membership={m} onClose={() => setSwitching(false)} />
      )}
    </div>
  );
}

function SwitchPlanModal(props: { membership: MyMembership; onClose: () => void }) {
  const m = props.membership;
  const toaster = useToaster();
  const router = useRouter();
  const [tierId, setTierId] = useState(m.tierId ?? m.availableTiers[0]?.id ?? "");
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
      toaster({ type: "error", content: "Couldn't switch plans. Please try again." });
      return;
    }
    toaster({ type: "success", content: "Plan updated." });
    props.onClose();
    router.refresh();
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Change plan"
      className="max-w-full w-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {m.availableTiers.map((t: AvailableTier) => (
            <label
              key={t.id}
              className={`flex items-start gap-2 border rounded-md px-3 py-2 cursor-pointer ${
                tierId === t.id
                  ? "border-accent-contrast"
                  : "border-border-light"
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
        <div className="flex justify-end">
          <ButtonPrimary type="button" disabled={saving || !tierId} onClick={save}>
            {saving ? <DotLoader /> : "Save"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}
