"use client";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { tierPriceLabel, type Cadence, type MembershipPlan } from "./TierGrid";
import type { MembershipTiers } from "src/membership";
import { useChangePreview, ChangePreviewLine } from "./changePreview";

type ChangingMembership = {
  id: string;
  tierId: string | null;
  cadence: string | null;
  currentPeriodEnd: string | null;
  pendingPlan?: { tierName: string | null } | null;
};

type TierChangeConfirmProps = {
  membership: ChangingMembership;
  tiers: MembershipTiers;
  newPlan: MembershipPlan;
  cadence: Cadence;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function TierChangeConfirm(props: TierChangeConfirmProps) {
  const { membership } = props;
  const free = props.newPlan.kind === "subscriber";
  const currentTier = props.tiers.paid.find(
    (tier) => tier.id === membership.tierId,
  );
  const currentCadence: Cadence =
    membership.cadence === "year" ? "year" : "month";
  const preview = useChangePreview({
    enabled: !free,
    membershipId: membership.id,
    tierId: props.newPlan.kind === "paid" ? props.newPlan.tier.id : null,
    cadence: props.cadence,
  });
  const endDate = useLocalizedDate(membership.currentPeriodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto text-center">
      <div className="text-secondary leading-snug">
        <div className="flex flex-col justify-center items-center mx-auto gap-1 pt-2">
          {currentTier && (
            <>
              <div className="opaque-container w-fit py-0.5 px-2 text-tertiary">
                {currentTier.name} ·{" "}
                {tierPriceLabel(currentTier, currentCadence)}
              </div>
              <GoToArrowLined className="rotate-90 text-tertiary" />
            </>
          )}
          <div className="accent-container w-fit py-0.5 px-2 font-bold text-accent-contrast border border-accent-contrast">
            {props.newPlan.tier.name}
            {props.newPlan.kind === "paid" && (
              <> · {tierPriceLabel(props.newPlan.tier, props.cadence)}</>
            )}
          </div>
        </div>
      </div>
      {free ? (
        <div className="text-tertiary text-sm">
          You'll keep member access{" "}
          {membership.currentPeriodEnd
            ? `until ${endDate}`
            : "until the end of your billing period"}
        </div>
      ) : (
        <ChangePreviewLine
          state={preview}
          className="text-tertiary text-sm text-center mx-auto"
        />
      )}
      {membership.pendingPlan && (
        <div className="text-tertiary text-sm">
          This replaces your scheduled switch to{" "}
          {membership.pendingPlan.tierName ?? "another plan"}.
        </div>
      )}
      <div className="flex gap-3 mx-auto">
        <ButtonTertiary type="button" onClick={props.onClose}>
          Nevermind
        </ButtonTertiary>
        <ButtonPrimary
          type="button"
          disabled={props.busy || preview?.status === "loading"}
          onClick={props.onConfirm}
        >
          {props.busy ? <DotLoader /> : "Change Membership"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
