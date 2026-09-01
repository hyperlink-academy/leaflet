"use client";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { ToggleGroup } from "components/ToggleGroup";
import { CheckTiny } from "components/Icons/CheckTiny";
import {
  membershipUnlocksGatedPost,
  type GatePolicy,
  type MembershipTiers,
  type PaidTier,
  type ResolvedPublicationMembership,
  type SubscriberTier,
} from "src/membership";
import { TierDescription } from "components/Memberships/TierDescription";

// Stored tiers are always paid tiers now.
export type Tier = PaidTier;

export type MembershipPlan =
  | { kind: "subscriber"; tier: SubscriberTier }
  | { kind: "paid"; tier: PaidTier };

export type Cadence = "month" | "year";

export const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

export function tierPriceCents(tier: PaidTier, cadence: Cadence) {
  return cadence === "year" && tier.annual_price_cents != null
    ? tier.annual_price_cents
    : tier.monthly_price_cents;
}

export function tierPriceLabel(tier: PaidTier, cadence: Cadence) {
  const annual = cadence === "year" && tier.annual_price_cents != null;
  return `${formatPrice(tierPriceCents(tier, cadence))}/${annual ? "yr" : "mo"}`;
}

export function subscribeErrorMessage(error: string): string {
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

export const effectiveCadence = (tier: PaidTier, cadence: Cadence): Cadence =>
  tier.annual_price_cents != null ? cadence : "month";

export const membershipPlanKey = (plan: MembershipPlan) =>
  plan.kind === "subscriber" ? "subscriber" : plan.tier.id;

export function TierGrid(props: {
  tiers: MembershipTiers;
  cadence: Cadence;
  onCadenceChange: (cadence: Cadence) => void;
  busyPlan: string | null;
  currentMembership?: ResolvedPublicationMembership | null;
  gatePolicy?: GatePolicy | null;
  onSelectPlan: (plan: MembershipPlan) => void;
}) {
  const paidTiers = [...props.tiers.paid].sort(
    (a, b) =>
      tierPriceCents(a, props.cadence) - tierPriceCents(b, props.cadence),
  );
  const plans: MembershipPlan[] = [
    { kind: "subscriber", tier: props.tiers.subscriber },
    ...paidTiers.map((tier): MembershipPlan => ({ kind: "paid", tier })),
  ];
  const hasAnnual = paidTiers.some((t) => t.annual_price_cents != null);
  const currentMembership = props.currentMembership;
  const currentPaidTier =
    currentMembership?.kind === "paid"
      ? props.tiers.paid.find((tier) => tier.id === currentMembership.tierId)
      : undefined;
  const currentMonthlyCents = currentPaidTier
    ? currentPaidTier.monthly_price_cents
    : currentMembership?.kind === "free"
      ? 0
      : null;

  const paidLabel = (tier: PaidTier) => {
    const price = tierPriceLabel(tier, effectiveCadence(tier, props.cadence));
    if (!currentMembership) return `Join for ${price}`;
    if (
      currentMonthlyCents != null &&
      tier.monthly_price_cents > currentMonthlyCents
    )
      return `Upgrade for ${price}`;
    return `Change for ${price}`;
  };

  const cols = Math.min(plans.length, plans.length % 3 === 1 ? 2 : 3);

  return (
    <>
      {hasAnnual && (
        <div className="flex justify-center pb-4">
          <ToggleGroup
            value={props.cadence}
            onChange={props.onCadenceChange}
            optionClassName="px-8"
            options={[
              { value: "month", label: "Monthly" },
              { value: "year", label: "Annual" },
            ]}
          />
        </div>
      )}

      <div
        className="tierGroup sm:grid sm:gap-x-3 sm:gap-y-6 gap-6 flex flex-col w-full items-stretch min-h-0 grow"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {plans.map((plan) => {
          const key = membershipPlanKey(plan);
          const current =
            plan.kind === "subscriber"
              ? currentMembership?.kind === "free"
              : currentMembership?.kind === "paid" &&
                currentMembership.tierId === plan.tier.id;
          const resolvedMembership: ResolvedPublicationMembership =
            plan.kind === "subscriber"
              ? { kind: "free" }
              : { kind: "paid", tierId: plan.tier.id };
          return (
            <div
              key={key}
              className="tier opaque-container rounded-lg! relative flex flex-col p-4 pt-3 max-w-md w-full max-h-full"
            >
              <div className="flex flex-col gap-1 grow min-h-0 overflow-y-scroll">
                <h3 className="text-primary text-[20px]">{plan.tier.name}</h3>
                {plan.tier.description && (
                  <div className="text-secondary text-sm leading-snug pb-3">
                    <TierDescription description={plan.tier.description} />
                  </div>
                )}
              </div>
              <div className="tierJoinButton shrink-0 flex flex-col gap-2">
                <hr className="border-border-light" />
                {current ? (
                  <ButtonSecondary fullWidth type="button" disabled>
                    <span className="flex items-center gap-1">
                      <CheckTiny className="shrink-0" /> Subscribed
                    </span>
                  </ButtonSecondary>
                ) : plan.kind === "subscriber" ? (
                  <ButtonSecondary
                    fullWidth
                    type="button"
                    disabled={props.busyPlan !== null}
                    onClick={() => props.onSelectPlan(plan)}
                  >
                    {props.busyPlan === key ? (
                      <DotLoader />
                    ) : currentMembership ? (
                      "Change to free"
                    ) : (
                      "Subscribe for free"
                    )}
                  </ButtonSecondary>
                ) : (
                  <ButtonPrimary
                    fullWidth
                    type="button"
                    disabled={props.busyPlan !== null}
                    onClick={() => props.onSelectPlan(plan)}
                  >
                    {props.busyPlan === key ? (
                      <DotLoader />
                    ) : (
                      paidLabel(plan.tier)
                    )}
                  </ButtonPrimary>
                )}
              </div>
              {props.gatePolicy &&
                membershipUnlocksGatedPost(
                  resolvedMembership,
                  props.gatePolicy,
                ) && (
                  <div className="tierPostUnlockIndicator absolute -bottom-3.5 left-0 right-0 flex justify-center">
                    <div className="opaque-container rounded-full! flex items-center gap-1 mx-auto px-2 py-0.5 text-xs font-bold text-accent-contrast">
                      <CheckTiny className="w-3 h-3 shrink-0" />
                      Unlocks post
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </>
  );
}
