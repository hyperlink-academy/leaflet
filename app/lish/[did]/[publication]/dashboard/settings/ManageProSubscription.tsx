import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { PubSettingsHeader } from "./PublicationSettings";
import { cancelSubscription } from "actions/cancelSubscription";
import { reactivateSubscription } from "actions/reactivateSubscription";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

export const ManageProSubscription = (props: { backToMenu: () => void }) => {
  const [state, setState] = useState<"manage" | "confirm" | "success">(
    "manage",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identity, mutate } = useIdentityData();

  const subscription = identity?.subscription;
  const renewalDate = useLocalizedDate(
    subscription?.current_period_end || new Date().toISOString(),
    { month: "long", day: "numeric", year: "numeric" },
  );

  async function handleCancel() {
    setLoading(true);
    setError(null);
    let result = await cancelSubscription();
    if (result.ok) {
      setState("success");
      mutate();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleReactivate() {
    setLoading(true);
    setError(null);
    let result = await reactivateSubscription();
    if (result.ok) {
      mutate();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

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
              {subscription?.plan || "Pro"} subscription
              <div className="text-lg font-bold text-primary">
                {subscription?.plan || "Leaflet Pro"}
              </div>
              {subscription?.status === "canceled"
                ? "Your subscription has ended"
                : subscription?.status === "canceling"
                  ? `Access until ${renewalDate}`
                  : `Renews on ${renewalDate}`}
            </div>
            {subscription?.status === "canceling" && (
              <ButtonPrimary
                className="mx-auto"
                compact
                onClick={handleReactivate}
                disabled={loading}
              >
                {loading ? <DotLoader /> : "Reactivate Subscription"}
              </ButtonPrimary>
            )}
            {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
            {subscription?.status !== "canceling" &&
              subscription?.status !== "canceled" && (
                <ButtonPrimary
                  className="mx-auto"
                  compact
                  onClick={() => setState("confirm")}
                >
                  Cancel Subscription
                </ButtonPrimary>
              )}
          </>
        )}
        {state === "confirm" && (
          <>
            <div>Are you sure you'd like to cancel your subscription?</div>
            <ButtonPrimary
              className="mx-auto"
              compact
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? <DotLoader /> : "Yes, Cancel it"}
            </ButtonPrimary>
            {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
          </>
        )}
        {state === "success" && (
          <div>
            Your subscription has been cancelled. You'll have access until{" "}
            {renewalDate}.
          </div>
        )}
      </div>
    </div>
  );
};
