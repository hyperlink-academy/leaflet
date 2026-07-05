"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { buildOauthLoginUrl } from "src/utils/customDomain";
import { startMembershipCheckout } from "actions/publications/startMembershipCheckout";
import { SpeedyLink } from "components/SpeedyLink";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
};

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

export function JoinTiers(props: {
  publicationUri: string;
  publicationName: string;
  publicationUrl: string;
  tiers: Tier[];
  loggedIn: boolean;
  isOwner: boolean;
  isMember: boolean;
}) {
  let toaster = useToaster();
  let hasAnnual = props.tiers.some((t) => t.annual_price_cents != null);
  let [cadence, setCadence] = useState<"month" | "year">("month");
  let [checkingOut, setCheckingOut] = useState<string | null>(null);

  let joinTier = async (tier: Tier) => {
    if (checkingOut) return;
    if (!props.loggedIn) {
      window.location.href = buildOauthLoginUrl({
        redirect: window.location.href,
      });
      return;
    }
    setCheckingOut(tier.id);
    let res = await startMembershipCheckout({
      publicationUri: props.publicationUri,
      tierId: tier.id,
      cadence: tier.annual_price_cents != null ? cadence : "month",
      returnUrl: props.publicationUrl,
    });
    if (!res.ok) {
      setCheckingOut(null);
      toaster({
        type: "error",
        content:
          res.error === "already_member"
            ? "You're already a member!"
            : res.error === "not_authenticated"
              ? "Sign in to become a member."
              : "We couldn't start the checkout. Please try again!",
      });
      return;
    }
    // Keep the spinner while the browser navigates to Stripe.
    window.location.href = res.value.url;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <div className="text-center flex flex-col gap-1">
        <h2 className="text-primary">
          Become a member of {props.publicationName}
        </h2>
        <p className="text-secondary">
          Members unlock members-only posts and support the publication
          directly.
        </p>
      </div>

      {props.isOwner ? (
        <div className="opaque-container px-4 py-6 text-center text-secondary">
          This is your publication — readers see your membership tiers here.
        </div>
      ) : props.isMember ? (
        <div className="opaque-container px-4 py-6 text-center flex flex-col gap-2">
          <div className="font-bold text-primary">
            You're already a member!
          </div>
          <SpeedyLink
            href={props.publicationUrl}
            className="text-accent-contrast font-bold"
          >
            Back to {props.publicationName}
          </SpeedyLink>
        </div>
      ) : props.tiers.length === 0 ? (
        <div className="opaque-container px-4 py-6 text-center text-secondary">
          No membership tiers are available yet. Check back soon!
        </div>
      ) : (
        <>
          {hasAnnual && (
            <div className="flex justify-center gap-1">
              {(["month", "year"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCadence(c)}
                  className={`px-2 py-0.5 rounded-md text-sm font-bold ${
                    cadence === c
                      ? "bg-accent-1 text-accent-2"
                      : "text-tertiary hover:text-primary"
                  }`}
                >
                  {c === "month" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
          )}
          {props.tiers.map((tier) => {
            let annual = cadence === "year" && tier.annual_price_cents != null;
            let price = annual
              ? tier.annual_price_cents!
              : tier.monthly_price_cents;
            return (
              <div
                key={tier.id}
                className="opaque-container flex flex-col gap-2 px-4 py-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-primary">{tier.name}</h3>
                  <div className="text-secondary font-bold shrink-0">
                    {formatPrice(price)}/{annual ? "year" : "month"}
                  </div>
                </div>
                {tier.description && (
                  <p className="text-secondary text-sm leading-snug">
                    {tier.description}
                  </p>
                )}
                <ButtonPrimary
                  type="button"
                  className="self-start"
                  disabled={checkingOut !== null}
                  onClick={() => joinTier(tier)}
                >
                  {checkingOut === tier.id ? <DotLoader /> : "Join"}
                </ButtonPrimary>
              </div>
            );
          })}
          {!props.loggedIn && (
            <p className="text-tertiary text-sm text-center">
              You'll be asked to sign in before checkout.
            </p>
          )}
        </>
      )}
    </div>
  );
}
