"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonSecondary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { SpeedyLink } from "components/SpeedyLink";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  ChangePlanModal,
  MembershipActions,
  membershipPrice,
  isMembershipActive as isActive,
} from "components/Memberships/ChangePlanModal";
import { CancelMembershipModal } from "components/Memberships/CancelMembershipModal";
import {
  updateWalletCard,
  updateWalletCardFromSetupIntent,
  type MyMembership,
  type MyMembershipsData,
} from "actions/memberships";
import { Modal } from "components/Modal";
import { useIdentityData } from "components/IdentityProvider";
import { WalletPaymentForm } from "components/Payments/WalletPaymentForm";
import { SettingsSection } from "components/SettingsLayout";

export function BillingTab(props: { initial: MyMembershipsData }) {
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
      window.history.replaceState(null, "", "/settings?tab=billing");
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
    <>
      <WalletCardSection wallet={wallet} processing={processingReturn} />

      <SettingsSection title="Your Memberships">
        {memberships.length === 0 ? (
          <div className="px-4 py-6 text-center italic text-tertiary">
            You're not a paying member of any publication yet…
          </div>
        ) : (
          memberships.map((m) => <MembershipRow key={m.id} membership={m} />)
        )}
      </SettingsSection>
    </>
  );
}

function WalletCardSection(props: {
  wallet: MyMembershipsData["wallet"];
  processing: boolean;
}) {
  const toaster = useToaster();
  const router = useRouter();
  const { identity } = useIdentityData();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const card = props.wallet;

  // Save the confirmed method as the wallet default and re-clone it onto
  // every membership so renewals bill the new card.
  const onSaved = async (setupIntentId: string) => {
    setSaving(true);
    const res = await updateWalletCardFromSetupIntent(setupIntentId);
    setFormOpen(false);
    setSaving(false);
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
  };

  return (
    <SettingsSection title="Connected Card">
      <div className="flex flex-col">
        {props.processing || saving ? (
          <div className="text-tertiary text-sm">Updating…</div>
        ) : card?.card_last4 ? (
          <div className="flex items-baseline justify-between gap-2">
            <div>
              {(card.card_brand ?? "Card").replace(/^\w/, (c) =>
                c.toUpperCase(),
              )}{" "}
              ···{card.card_last4}
              {card.card_exp_month && card.card_exp_year
                ? ` · expires ${String(card.card_exp_month).padStart(2, "0")}/${String(
                    card.card_exp_year,
                  ).slice(-2)}`
                : ""}
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="text-accent-contrast font-bold text-sm shrink-0"
            >
              Update card
            </button>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-1 text-tertiary italic text-center mx-auto">
            <div>No card on file yet…</div>
            <button
              type="button"
              disabled={props.processing}
              onClick={() => setFormOpen(true)}
              className="text-accent-contrast font-bold"
            >
              Add card
            </button>
          </div>
        )}
      </div>
      {formOpen && (
        <Modal
          open
          onOpenChange={(o) => !o && setFormOpen(false)}
          title="Connected Card"
          className="max-w-full w-sm"
        >
          <WalletPaymentForm
            submitLabel="Save card"
            email={identity?.email}
            onSuccess={onSaved}
          />
        </Modal>
      )}
    </SettingsSection>
  );
}

function MembershipRow(props: { membership: MyMembership }) {
  const m = props.membership;
  const [changingPlan, setChangingPlan] = useState(false);
  const [cancelling, setCancelling] = useState(false);
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
          : m.status ?? "Inactive";

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
        <MembershipActions
          membership={m}
          onChangePlan={() => setChangingPlan(true)}
          onCancel={() => setCancelling(true)}
        />
      </div>
      {changingPlan && (
        <ChangePlanModal
          membership={m}
          onClose={() => setChangingPlan(false)}
        />
      )}
      {cancelling && (
        <CancelMembershipModal
          membership={m}
          onClose={() => setCancelling(false)}
        />
      )}
    </div>
  );
}
