import { ButtonPrimary } from "components/Buttons";
import { Modal } from "components/Modal";
import { useState } from "react";

export const UpgradeContent = () => {
  let [cadence, setCadence] = useState<"year" | "month">("year");
  return (
    <div className="flex flex-col justify-center text-center sm:gap-4 gap-2 w-full">
      <h2>Get Leaflet Pro!</h2>
      <div className="flex sm:flex-row flex-col sm:gap-8 gap-4 items-stretch w-full">
        <div className="text-secondary sm:py-6 py-4 px-4">
          <div className="font-bold text-primary">Analytics</div>
          <div className="">Views per Post</div>
          <div className="">Subscriber Counts</div>
          <div className="">Top Referrers</div>
          <hr className="my-4 border-border-light" />
          <div className="font-bold text-primary">Coming ASAP</div>
          <div className="">Emails</div>
          <div className="">Paid Membership</div>
        </div>
        <div className="sm:w-64  w-full accent-container flex justify-center items-center">
          <div className="flex flex-col justify-center text-center py-6">
            <div className="flex gap-2 mb-3 p-1 bg-accent-contrast rounded-lg text-sm">
              <button
                className={`px-1 rounded-md ${cadence === "year" ? "bg-bg-page font-bold text-accent-contrast" : "bg-transparent text-bg-page"}`}
                onClick={() => setCadence("year")}
              >
                Yearly
              </button>
              <button
                className={`px-1 rounded-md ${cadence === "month" ? "bg-bg-page font-bold text-accent-contrast" : "bg-transparent text-bg-page"}`}
                onClick={() => setCadence("month")}
              >
                Monthly
              </button>
            </div>
            <div className="flex gap-1 items-baseline justify-center">
              <div className="text-2xl font-bold leading-tight">
                {cadence === "year" ? "$120" : "$12"}
              </div>
              <div className="text-secondary pb-4">
                {cadence === "year" ? "/year" : "/month"}
              </div>
            </div>
            <ButtonPrimary fullWidth className="mx-auto">
              Get it!
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UpgradeModal = (props: {
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
