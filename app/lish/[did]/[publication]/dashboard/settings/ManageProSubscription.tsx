import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { PubSettingsHeader } from "./PublicationSettings";

export const ManageProSubscription = (props: { backToMenu: () => void }) => {
  const [state, setState] = useState<"manage" | "confirm" | "success">(
    "manage",
  );

  return (
    <div>
      <PubSettingsHeader backToMenuAction={props.backToMenu}>
        Manage Subscription
      </PubSettingsHeader>
      <div className="text-secondary text-center flex flex-col justify-center gap-2 py-2">
        {state === "manage" && (
          <>
            <div>
              You have a <br />
              Pro monthly subscription
              <div className="text-lg font-bold text-primary">$12/mo </div>
              Renews on the 12th
            </div>
            <ButtonPrimary
              className="mx-auto"
              compact
              onClick={() => setState("confirm")}
            >
              Cancel Subscription
            </ButtonPrimary>
          </>
        )}
        {state === "confirm" && (
          <>
            <div>Are you sure you'd like to cancel your subscription?</div>
            <ButtonPrimary
              className="mx-auto"
              compact
              onClick={() => setState("success")}
            >
              Yes, Cancel it
            </ButtonPrimary>
          </>
        )}
        {state === "success" && (
          <div>Your subscription has been successfully cancelled!</div>
        )}
      </div>
    </div>
  );
};
