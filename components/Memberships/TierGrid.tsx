"use client";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { ToggleGroup } from "components/ToggleGroup";
import { CheckTiny } from "components/Icons/CheckTiny";
import { tierUnlocksGatedPost } from "src/membership";
import { TierDescription } from "components/Memberships/TierDescription";

export type Tier = {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  // The always-free tier: subscribing to it just follows the pub (no paid
  // membership, so members-only posts stay locked), so it never routes to
  // payment. Exactly one per publication.
  is_free: boolean;
};

export type Cadence = "month" | "year";

export const isFreeTier = (tier: Tier) => tier.is_free;

export const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

export function tierPriceCents(tier: Tier, cadence: Cadence) {
  return cadence === "year" && tier.annual_price_cents != null
    ? tier.annual_price_cents
    : tier.monthly_price_cents;
}

export function tierPriceLabel(tier: Tier, cadence: Cadence) {
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

export function TierGrid(props: {
  tiers: Tier[];
  cadence: Cadence;
  onCadenceChange: (cadence: Cadence) => void;
  busyTierId: string | null;
  isSubscribed: boolean;
  // The viewer's active paid membership tier, if any.
  currentTierId?: string | null;
  unlocksPost?: boolean;
  // The tiers the gated post's delimiter names; with unlocksPost, only those
  // get the "Unlocks post" badge. null/absent means every paid tier unlocks.
  unlocksPostTierIds?: string[] | null;
  onSelectTier: (tier: Tier) => void;
}) {
  const hasAnnual = props.tiers.some((t) => t.annual_price_cents != null);
  const effectiveCadence = (tier: Tier): Cadence =>
    tier.annual_price_cents != null ? props.cadence : "month";
  const renderTiers = [...props.tiers].sort(
    (a, b) =>
      tierPriceCents(a, props.cadence) - tierPriceCents(b, props.cadence),
  );

  const currentTier = props.currentTierId
    ? props.tiers.find((t) => t.id === props.currentTierId)
    : undefined;
  // "Upgrade" compares cost per month; a free-tier subscriber sits at $0 so
  // every paid tier is an upgrade for them.
  const currentMonthlyCents = currentTier
    ? currentTier.monthly_price_cents
    : props.isSubscribed
      ? 0
      : null;

  const paidLabel = (tier: Tier) => {
    const price = tierPriceLabel(tier, effectiveCadence(tier));
    if (currentMonthlyCents == null) return `Join for ${price}`;
    if (tier.monthly_price_cents > currentMonthlyCents)
      return `Upgrade for ${price}`;
    return `Switch for ${price}`;
  };

  let cols = Math.min(renderTiers.length, renderTiers.length % 3 === 1 ? 2 : 3);

  return (
    <>
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

      <div
        className="tierGroup sm:grid sm:gap-x-3 sm:gap-y-6 gap-6 flex flex-col w-full items-stretch min-h-0 grow"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {renderTiers.map((tier) => {
          const free = isFreeTier(tier);
          // A free-tier subscriber has no membership row to name a tier, so
          // being subscribed with no paid membership is what puts them on free.
          const isCurrent = props.currentTierId
            ? tier.id === props.currentTierId
            : free && props.isSubscribed;
          return (
            <div
              key={tier.id}
              className="tier opaque-container rounded-lg! relative flex flex-col p-4 pt-3 max-w-md w-full max-h-full"
            >
              <div className="flex flex-col gap-1 grow min-h-0 overflow-y-scroll">
                <h3 className="text-primary text-[20px]">{tier.name}</h3>
                {tier.description && (
                  <div className="text-secondary text-sm leading-snug pb-3">
                    <TierDescription description={tier.description} />
                  </div>
                )}
              </div>
              <div className="tierJoinButton shrink-0 flex flex-col gap-2">
                <hr className="border-border-light" />
                {isCurrent ? (
                  <ButtonSecondary fullWidth type="button" disabled>
                    <span className="flex items-center gap-1">
                      <CheckTiny className="shrink-0" /> Subscribed
                    </span>
                  </ButtonSecondary>
                ) : free ? (
                  <ButtonSecondary
                    fullWidth
                    type="button"
                    disabled={props.busyTierId !== null}
                    onClick={() => props.onSelectTier(tier)}
                  >
                    {props.busyTierId === tier.id ? (
                      <DotLoader />
                    ) : props.currentTierId ? (
                      "Switch to free"
                    ) : (
                      "Subscribe for free"
                    )}
                  </ButtonSecondary>
                ) : (
                  <ButtonPrimary
                    fullWidth
                    type="button"
                    disabled={props.busyTierId !== null}
                    onClick={() => props.onSelectTier(tier)}
                  >
                    {props.busyTierId === tier.id ? (
                      <DotLoader />
                    ) : (
                      paidLabel(tier)
                    )}
                  </ButtonPrimary>
                )}
              </div>
              {props.unlocksPost &&
                tierUnlocksGatedPost(tier, props.unlocksPostTierIds) && (
                  <div className="tierPostUnlockIndicator absolute -bottom-3.5 left-0 right-0 flex justify-center">
                    <div className="opaque-container rounded-full! flex items-center gap-1 mx-auto  px-2 py-0.5 text-xs font-bold text-accent-contrast ">
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
