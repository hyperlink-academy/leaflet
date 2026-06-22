"use client";
import { ButtonPrimary } from "components/Buttons";
import { Modal } from "components/Modal";
import { useState } from "react";
import { createCheckoutSession } from "actions/createCheckoutSession";
import { DotLoader } from "components/utils/DotLoader";
import { ToggleGroup } from "components/ToggleGroup";
import { SaleSticker } from "components/SaleSticker";

export const UpgradeContent = () => {
  let [cadence, setCadence] = useState<"year" | "month">("year");
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    let result = await createCheckoutSession(cadence, window.location.href);
    if (result.ok) {
      window.location.href = result.value.url;
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-center text-center sm:gap-4 gap-2 w-full">
      <h2>Get Leaflet Pro!</h2>
      <div className="flex sm:flex-row flex-col sm:gap-8 gap-4 items-stretch w-full">
        <div className="text-secondary sm:w-64 sm:py-6 py-4 px-4">
          <div className="font-bold text-primary">Analytics</div>
          <div className="text-sm italic flex flex-col gap-0">
            <div className="">
              Views per Post, Subscriber Counts, Top Referrers
            </div>
          </div>
          <hr className="my-4 border-border-light" />
          <div className="font-bold text-primary">Emails</div>
          <div className="text-sm italic">
            First 1,000 subscribers included, $5/1K after that
          </div>
          <hr className="my-4 border-border-light" />

          <div className="font-bold text-primary">Group Publications</div>

          <hr className="my-4 border-border-light" />
          <div className="font-bold text-primary">Coming ASAP</div>
          <div className="">Paid Membership</div>
        </div>
        <div className="sm:w-64  w-full accent-container flex justify-center items-center">
          <div className="flex flex-col justify-center text-center py-6 px-3 ">
            <div className="mx-auto mb-3">
              <ToggleGroup
                value={cadence}
                onChange={setCadence}
                options={[
                  { value: "year", label: "Yearly" },
                  { value: "month", label: "Monthly" },
                ]}
              />
            </div>

            <div className="flex gap-1 items-baseline justify-center pb-4">
              <div className="text-2xl font-bold leading-tight">
                {cadence === "year" ? (
                  <div className="flex gap-1 items-baseline">
                    <div className="relative text-tertiary text-lg ">
                      $120
                      <div className="-rotate-16 absolute h-0.5 top-3 -left-1 -right-1 bg-tertiary border-1 " />
                    </div>
                    <div>$90</div>
                  </div>
                ) : (
                  "$12"
                )}
              </div>
              <div className="text-secondary">
                {cadence === "year" ? "/year" : "/month"}
              </div>
            </div>
            {cadence === "year" && (
              <div className="frosted-container pt-2 pb-4 px-3  text-secondary gap-2 text-center leading-snug   mb-4 w-full ">
                <div className="font-bold flex items-center gap-1 justify-center w-full">
                  <SaleSticker width={48} />
                  your first year!{" "}
                </div>
                <div className="text-sm font-normal!">
                  Get your Summer Pass, <br /> only available until July 31
                </div>
              </div>
            )}
            <ButtonPrimary
              fullWidth
              className="mx-auto"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? <DotLoader /> : "Get it!"}
            </ButtonPrimary>

            {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const UpgradeModal = (props: {
  trigger: React.ReactNode;
  asChild?: boolean;
}) => {
  return (
    <Modal
      asChild={props.asChild}
      className="sm:w-fit w-[90vw]"
      trigger={<div className="sm:w-full">{props.trigger}</div>}
    >
      <UpgradeContent />
    </Modal>
  );
};

export const InlineUpgradeToPro = (props: {
  compact?: boolean;
  onClick?: () => void;
}) => {
  return (
    <div className="text-center  text-secondary">
      <UpgradeToProButton
        fullWidth
        compact={props.compact}
        onClick={props.onClick}
      />
      <div
        className={`${props.compact ? `text-sm` : "text-base"} leading-snug text-tertiary pt-2`}
      >
        Analytics and Emails for all your pubs! <br /> Membership coming soon.
      </div>
    </div>
  );
};

export const UpgradeToProButton = (props: {
  fullWidth?: boolean;
  compact?: boolean;
  // When provided, the button defers opening the modal to the caller (used
  // when the modal must live outside a closing container like a popover).
  onClick?: () => void;
}) => {
  let button = (
    <ButtonPrimary
      type="button"
      compact={props.compact}
      fullWidth={props.fullWidth}
      className={props.compact ? `text-sm` : "text-base"}
      onClick={props.onClick}
    >
      Upgrade to Leaflet Pro!
    </ButtonPrimary>
  );
  if (props.onClick) return button;
  return <UpgradeModal asChild trigger={button} />;
};
