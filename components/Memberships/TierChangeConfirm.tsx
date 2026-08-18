"use client";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import {
  isFreeTier,
  tierPriceLabel,
  type Tier,
  type Cadence,
} from "./TierGrid";
import { useChangePreview, ChangePreviewLine } from "./changePreview";

type ChangingMembership = {
  id: string;
  tierId: string | null;
  cadence: string | null;
  currentPeriodEnd: string | null;
};

type TierChangeConfirmProps = {
  membership: ChangingMembership;
  tiers: Tier[];
  newTier: Tier;
  cadence: Cadence;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function TierChangeConfirm(props: TierChangeConfirmProps) {
  const { membership } = props;
  const free = isFreeTier(props.newTier);
  const currentTier = props.tiers.find((t) => t.id === membership.tierId);
  const currentCadence: Cadence =
    membership.cadence === "year" ? "year" : "month";
  const preview = useChangePreview({
    enabled: !free,
    membershipId: membership.id,
    tierId: props.newTier.id,
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
            {props.newTier.name}
            {!free && <> · {tierPriceLabel(props.newTier, props.cadence)}</>}
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
