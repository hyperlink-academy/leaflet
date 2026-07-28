"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { SpeedyLink } from "components/SpeedyLink";
import {
  subscribeToTier,
  createWalletCheckoutSession,
  saveWalletCardFromSession,
} from "actions/publications/joinMembership";
import { switchMembership } from "actions/memberships";
import { LoginModal } from "components/LoginButton";
import { Modal } from "components/Modal";
import { MembershipSubscribe } from "components/Memberships/MembershipSubscribeStep";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { ManageSubscription } from "components/Subscribe/ManageSubscribe";
import {
  TierGrid,
  isFreeTier,
  subscribeErrorMessage,
  type Tier,
  type Cadence,
} from "components/Memberships/TierGrid";
import { readJoinResume } from "components/Memberships/joinReturn";

export function JoinTiers(props: {
  publicationUri: string;
  publicationName: string;
  publicationUrl: string;
  tiers: Tier[];
  loggedIn: boolean;
  isOwner: boolean;
  // The viewer's active paid membership, if any — switches happen in place
  // (prorated) instead of creating a new subscription.
  membership?: {
    id: string;
    tierId: string | null;
    cadence: string | null;
  } | null;
  email?: string | null;
  handle?: string | null;
  walletCard: { brand: string | null; last4: string | null } | null;
  newsletterMode: boolean;
}) {
  const toaster = useToaster();
  const router = useRouter();
  const [cadence, setCadence] = useState<Cadence>("month");
  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const [processingReturn, setProcessingReturn] = useState(false);
  // The tier whose subscribe step is open in the modal; when the reader
  // finishes subscribing we move it straight into payment setup.
  const [subscribeTier, setSubscribeTier] = useState<Tier | null>(null);

  const effectiveCadence = (tier: Tier): Cadence =>
    tier.annual_price_cents != null ? cadence : "month";

  const canPayDirectly =
    props.loggedIn && (props.newsletterMode ? !!props.email : !!props.handle);
  const subscribingAs = props.newsletterMode
    ? props.email
    : props.handle
      ? `@${props.handle}`
      : null;

  const viewerSub = useViewerSubscription(props.publicationUri);
  const isSubscribed = props.newsletterMode
    ? viewerSub.emailSubscribed
    : viewerSub.atprotoSubscribed;
  const membership = props.membership ?? null;

  // Creates the subscription with the saved card and acts on the result. Returns
  // "navigating" when it sends the browser elsewhere (success or hosted-invoice
  // fallback), so callers keep their spinner; "error" when it stayed put.
  const runSubscribe = async (
    tierId: string,
    joinCadence: Cadence,
  ): Promise<"navigating" | "error"> => {
    const res = await subscribeToTier({
      publicationUri: props.publicationUri,
      tierId,
      cadence: joinCadence,
    });
    if (!res.ok) {
      toaster({ type: "error", content: subscribeErrorMessage(res.error) });
      return "error";
    }
    const { status, hostedInvoiceUrl } = res.value;
    if (status === "active" || status === "trialing") {
      toaster({
        type: "success",
        content: `Welcome to ${props.publicationName}!`,
      });
      window.location.href = props.publicationUrl;
      return "navigating";
    }
    // Authentication needed or the charge was declined: finish on Stripe's page.
    if (hostedInvoiceUrl) {
      window.location.href = hostedInvoiceUrl;
      return "navigating";
    }
    toaster({
      type: "error",
      content: "We couldn't complete your payment. Please try again!",
    });
    return "error";
  };

  // Returning from the hosted setup page: save the card, then either
  // auto-complete the intended join (if the tier came along) or refresh so the
  // server re-renders with the saved card (one-click buttons).
  useEffect(() => {
    const resume = readJoinResume();
    // Only wallet returns land on /join; auth returns resume in the modal.
    if (resume?.kind !== "wallet") return;
    setProcessingReturn(true);
    saveWalletCardFromSession(resume.sessionId).then(async (res) => {
      if (!res.ok) {
        setProcessingReturn(false);
        toaster({
          type: "error",
          content: "We couldn't save your card. Please try again!",
        });
        return;
      }
      if (resume.tierId && resume.cadence) {
        const outcome = await runSubscribe(resume.tierId, resume.cadence);
        if (outcome === "navigating") return; // keep the spinner while we leave
      }
      router.refresh();
      setProcessingReturn(false);
    });
  }, []);

  const proceedToPayment = async (tier: Tier) => {
    setBusyTierId(tier.id);
    if (!props.walletCard?.last4) {
      const res = await createWalletCheckoutSession({
        returnUrl: window.location.origin + window.location.pathname,
        tierId: tier.id,
        cadence: effectiveCadence(tier),
      });
      if (!res.ok) {
        setBusyTierId(null);
        toaster({
          type: "error",
          content: "We couldn't open the card form. Please try again!",
        });
        return;
      }
      window.location.href = res.value.url;
      return;
    }
    const outcome = await runSubscribe(tier.id, effectiveCadence(tier));
    if (outcome === "error") setBusyTierId(null);
  };

  // Prorated in-place switch for an active paid membership.
  const runSwitch = async (tier: Tier) => {
    if (!membership) return;
    setBusyTierId(tier.id);
    const res = await switchMembership({
      membershipId: membership.id,
      tierId: tier.id,
      cadence: effectiveCadence(tier),
    });
    setBusyTierId(null);
    if (!res.ok) {
      toaster({
        type: "error",
        content: "We couldn't switch your plan. Please try again!",
      });
      return;
    }
    toaster({ type: "success", content: "Plan updated!" });
    router.refresh();
  };

  const selectTier = (tier: Tier) => {
    if (isFreeTier(tier)) {
      setSubscribeTier(tier);
      return;
    }
    // An active paid membership switches in place. Everyone else — including
    // free-tier subscribers upgrading — goes through the payment flow, since
    // the free tier has no Stripe subscription to switch from.
    if (membership) {
      runSwitch(tier);
      return;
    }
    if (canPayDirectly) proceedToPayment(tier);
    else setSubscribeTier(tier);
  };

  if (processingReturn) {
    return (
      <Shell name={props.publicationName}>
        <div className="opaque-container px-4 py-8 flex flex-col items-center gap-2">
          <DotLoader />
          <div className="text-secondary text-sm">
            Completing your membership…
          </div>
        </div>
      </Shell>
    );
  }

  if (props.isOwner) {
    return (
      <Shell name={props.publicationName}>
        <div className="opaque-container px-4 py-6 text-center text-secondary">
          This is your publication — readers see your membership tiers here.
        </div>
      </Shell>
    );
  }

  return (
    <Shell name={props.publicationName}>
      <TierGrid
        tiers={props.tiers}
        cadence={cadence}
        onCadenceChange={setCadence}
        busyTierId={busyTierId}
        isSubscribed={isSubscribed}
        currentTierId={membership?.tierId}
        onSelectTier={selectTier}
        renderFreeAction={(tier) =>
          isSubscribed ? (
            <ManageSubscription
              publicationUri={props.publicationUri}
              publicationUrl={props.publicationUrl}
              newsletterMode={props.newsletterMode}
              user={viewerSub}
            />
          ) : undefined
        }
      />

      {membership ? (
        <p className="text-tertiary text-sm text-center">
          Switching adjusts your next invoice with a prorated credit or charge.{" "}
          <SpeedyLink href="/memberships" className="underline">
            Manage your membership
          </SpeedyLink>
        </p>
      ) : (
        <p className="text-tertiary text-sm text-center">
          {!props.walletCard?.last4 ? (
            props.loggedIn ? null : (
              <>
                Already Subscribed?{" "}
                <LoginModal trigger={<div className="underline">Sign in</div>} />
              </>
            )
          ) : (
            <>Bill to card ending in {props.walletCard.last4}</>
          )}
        </p>
      )}
      {subscribingAs && (
        <p className="text-tertiary text-xs">Subscribing as {subscribingAs}</p>
      )}

      <Modal
        open={subscribeTier !== null}
        onOpenChange={(open) => {
          if (!open) setSubscribeTier(null);
        }}
        className="max-w-full w-md p-4 pt-3 sm:p-6 sm:pt-5"
        title=<div className="text-center pb-2">
          Where should we send updates?
        </div>
      >
        <MembershipSubscribe
          publicationUri={props.publicationUri}
          newsletterMode={props.newsletterMode}
          loggedIn={props.loggedIn}
          email={props.email}
          handle={props.handle}
          onSubscribed={() => {
            const tier = subscribeTier;
            setSubscribeTier(null);
            // The free tier is just the subscription itself — no payment step.
            if (tier && !isFreeTier(tier)) proceedToPayment(tier);
            else router.refresh();
          }}
        />
      </Modal>
    </Shell>
  );
}

function Shell(props: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="text-center flex flex-col gap-1 max-w-md mx-auto">
        <h2 className="text-primary leading-snug  text-xl">
          Become a member of {props.name}
        </h2>
        <p className="text-secondary">
          Members unlock members-only posts and support the publication
          directly.
        </p>
      </div>
      {props.children}
    </div>
  );
}
