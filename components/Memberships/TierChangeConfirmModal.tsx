"use client";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import {
  isFreeTier,
  tierPriceLabel,
  type Tier,
  type Cadence,
} from "./TierGrid";
import { useChangePreview, ChangePreviewLine } from "./changePreview";

export function TierChangeConfirmModal(props: {
  membershipId: string;
  currentTier: Tier | undefined;
  currentCadence: Cadence;
  newTier: Tier;
  cadence: Cadence;
  periodEnd: string | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const free = isFreeTier(props.newTier);
  const preview = useChangePreview({
    enabled: !free,
    membershipId: props.membershipId,
    tierId: props.newTier.id,
    cadence: props.cadence,
  });
  const endDate = useLocalizedDate(props.periodEnd ?? "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Modal
      open
      onOpenChange={(o) => !o && props.onClose()}
      title="Change your Membership"
      className="max-w-full w-sm bg-[var(--color-bg-light)]! text-center"
    >
      <div className="flex flex-col gap-3">
        <div className="text-secondary leading-snug">
          <div className="flex flex-col justify-center items-center mx-auto gap-1 pt-2">
            {props.currentTier && (
              <>
                <div className="opaque-container w-fit py-0.5 px-2 text-tertiary">
                  {props.currentTier.name} ·{" "}
                  {tierPriceLabel(props.currentTier, props.currentCadence)}
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
            {props.periodEnd
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
    </Modal>
  );
}
