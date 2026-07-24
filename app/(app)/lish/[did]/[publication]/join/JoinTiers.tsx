"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { SpeedyLink } from "components/SpeedyLink";
import { ToggleGroup } from "components/ToggleGroup";
import {
  subscribeToTier,
  createWalletCheckoutSession,
  saveWalletCardFromSession,
} from "actions/publications/joinMembership";
import { LoginModal } from "components/LoginButton";
import { CheckTiny } from "components/Icons/CheckTiny";
import { Modal } from "components/Modal";
import { MembershipSubscribe } from "components/Memberships/MembershipSubscribeStep";

export type Tier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
};

export type WalletCard = {
  brand: string | null;
  last4: string | null;
};

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

function tierPriceCents(tier: Tier, cadence: "month" | "year") {
  return cadence === "year" && tier.annual_price_cents != null
    ? tier.annual_price_cents
    : tier.monthly_price_cents;
}

function tierPriceLabel(tier: Tier, cadence: "month" | "year") {
  const annual = cadence === "year" && tier.annual_price_cents != null;
  return `${formatPrice(tierPriceCents(tier, cadence))}/${annual ? "yr" : "mo"}`;
}

function subscribeErrorMessage(error: string): string {
  switch (error) {
    case "already_member":
      return "You're already a member!";
    case "email_required":
      return "Add an email to your account before joining.";
    case "no_card":
      return "Please add a card to continue.";
    case "no_connected_account":
      return "This publication can't accept payments right now.";
    case "not_authenticated":
      return "Sign in to become a member.";
    default:
      return "We couldn't complete your join. Please try again!";
  }
}

export function JoinTiers(props: {
  publicationUri: string;
  publicationName: string;
  publicationUrl: string;
  tiers: Tier[];
  loggedIn: boolean;
  isOwner: boolean;
  isMember: boolean;
  email?: string | null;
  handle?: string | null;
  walletCard: WalletCard | null;
  unlocksPost?: boolean;
  newsletterMode: boolean;
  publicationDescription?: string;
  onRefresh?: () => void | Promise<void>;
  loginRedirect?: () => string;
}) {
  const toaster = useToaster();
  const router = useRouter();
  const hasAnnual = props.tiers.some((t) => t.annual_price_cents != null);
  const [cadence, setCadence] = useState<"month" | "year">("month");
  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const [processingReturn, setProcessingReturn] = useState(false);
  // The tier whose subscribe step is open in the modal; when the reader
  // finishes subscribing we move it straight into payment setup.
  const [subscribeTier, setSubscribeTier] = useState<Tier | null>(null);

  const effectiveCadence = (tier: Tier): "month" | "year" =>
    tier.annual_price_cents != null ? cadence : "month";

  const canPayDirectly =
    props.loggedIn && (props.newsletterMode ? !!props.email : !!props.handle);
  const subscribingAs = props.newsletterMode
    ? props.email
    : props.handle
      ? `@${props.handle}`
      : null;

  // Creates the subscription with the saved card and acts on the result. Returns
  // "navigating" when it sends the browser elsewhere (success or hosted-invoice
  // fallback), so callers keep their spinner; "error" when it stayed put.
  const runSubscribe = async (
    tierId: string,
    joinCadence: "month" | "year",
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

  // Returning from the hosted setup page: save the card, drop the markers from
  // the URL, then either auto-complete the intended join (if the tier came along)
  // or refresh so the server re-renders with the saved card (one-click buttons).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("wallet_session");
    if (!sessionId) return;
    const joinTier = params.get("join_tier");
    const joinCadence = params.get("join_cadence");
    setProcessingReturn(true);
    saveWalletCardFromSession(sessionId).then(async (res) => {
      window.history.replaceState(null, "", window.location.pathname);
      if (!res.ok) {
        setProcessingReturn(false);
        toaster({
          type: "error",
          content: "We couldn't save your card. Please try again!",
        });
        return;
      }
      if (joinTier && (joinCadence === "month" || joinCadence === "year")) {
        const outcome = await runSubscribe(joinTier, joinCadence);
        if (outcome === "navigating") return; // keep the spinner while we leave
      }
      await (props.onRefresh ? props.onRefresh() : router.refresh());
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

  if (props.isMember) {
    return (
      <Shell name={props.publicationName}>
        <div className="opaque-container px-4 py-6 text-center flex flex-col gap-2">
          <div className="font-bold text-primary">You're already a member!</div>
          <SpeedyLink
            href="/memberships"
            className="text-accent-contrast font-bold"
          >
            Manage your membership
          </SpeedyLink>
          <SpeedyLink
            href={props.publicationUrl}
            className="text-accent-contrast font-bold"
          >
            Back to {props.publicationName}
          </SpeedyLink>
        </div>
      </Shell>
    );
  }

  if (props.tiers.length === 0) {
    return (
      <Shell name={props.publicationName}>
        <div className="opaque-container px-4 py-6 text-center text-secondary">
          No membership tiers are available yet. Check back soon!
        </div>
      </Shell>
    );
  }

  return (
    <Shell name={props.publicationName}>
      {hasAnnual && (
        <div className="flex justify-center">
          <ToggleGroup
            value={cadence}
            onChange={setCadence}
            options={[
              { value: "month", label: "Monthly" },
              { value: "year", label: "Annual" },
            ]}
          />
        </div>
      )}
      <div className="flex sm:flex-col flex-col">
        {props.tiers.map((tier) => (
          <div
            key={tier.id}
            className="opaque-container relative flex flex-col basis-1 gap-1 p-4 pt-3 max-w-md mx-auto w-fill"
          >
            {props.unlocksPost && (
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-accent-1 px-2 py-0.5 text-xs font-bold text-accent-2">
                <CheckTiny className="w-3 h-3 shrink-0" />
                Unlocks this post
              </span>
            )}
            <h3 className="text-primary text-[20px]">{tier.name}</h3>
            {tier.description && (
              <p className="text-secondary text-sm leading-snug">
                {tier.description}
              </p>
            )}
            <ButtonPrimary
              fullWidth
              type="button"
              className="self-start mt-3"
              disabled={busyTierId !== null}
              onClick={() =>
                canPayDirectly ? proceedToPayment(tier) : setSubscribeTier(tier)
              }
            >
              {busyTierId === tier.id ? (
                <DotLoader />
              ) : (
                `Join for ${tierPriceLabel(tier, effectiveCadence(tier))}`
              )}
            </ButtonPrimary>
            {props.walletCard?.last4 && (
              <p className="text-tertiary text-xs">
                Bill to card ending in
                {props.walletCard.last4}
              </p>
            )}
            {canPayDirectly && subscribingAs && (
              <p className="text-tertiary text-xs">
                Subscribing as {subscribingAs}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-tertiary text-sm text-center">
        {!props.walletCard?.last4 ? (
          props.loggedIn ? (
            <>
              You'll add a card securely through Stripe before your first join.
            </>
          ) : (
            <>
              Already Subscribed?{" "}
              <LoginModal trigger={<div className="underline">Sign in</div>} />
            </>
          )
        ) : (
          <>Subscribe with card ending in {props.walletCard.last4}</>
        )}
      </p>

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
            if (tier) proceedToPayment(tier);
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
