"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { SpeedyLink } from "components/SpeedyLink";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  SwitchPlanModal,
  CancelMembershipModal,
  MembershipActions,
  membershipPrice,
  isMembershipActive as isActive,
} from "components/Memberships/SwitchPlanModal";
import {
  updateWalletCard,
  type MyMembership,
  type MyMembershipsData,
} from "actions/memberships";
import { createWalletCheckoutSession } from "actions/publications/joinMembership";

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
  const [switching, setSwitching] = useState(false);
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
          onSwitch={() => setSwitching(true)}
          onCancel={() => setCancelling(true)}
        />
      </div>
      {switching && (
        <SwitchPlanModal membership={m} onClose={() => setSwitching(false)} />
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
