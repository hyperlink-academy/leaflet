import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { createBillingPortalSession } from "actions/createBillingPortalSession";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PRODUCT_DEFINITION } from "stripe/products";

export const ManageProSubscription = (props: { compact?: boolean }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identity } = useIdentityData();

  const subscription = identity?.subscription;
  const renewalDate = useLocalizedDate(
    subscription?.current_period_end || new Date().toISOString(),
    { month: "long", day: "numeric", year: "numeric" },
  );

  async function handleManageBilling() {
    setLoading(true);
    setError(null);
    const result = await createBillingPortalSession(window.location.href);
    if (result.ok) {
      window.location.href = result.value.url;
    } else {
      setError(result.error);
      setLoading(false);
    }
  }
  if (props.compact) {
    return (
      <div className="text-secondary font-bold flex flex-col gap-1 justify-end">
        <ButtonPrimary
          className=""
          compact
          onClick={handleManageBilling}
          disabled={loading}
        >
          {loading ? <DotLoader /> : "Manage Billing"}
        </ButtonPrimary>
        <div className="text-tertiary text-sm font-normal">
          {subscription?.status === "canceled"
            ? "Your subscription has ended"
            : subscription?.status === "canceling"
              ? `Access until ${renewalDate}`
              : `Renews ${renewalDate}`}
        </div>

        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
      </div>
    );
  }
  return (
    <div>
      <div className="text-secondary text-center flex flex-col leading-snug justify-center gap-2 py-2">
        <div>
          You are subscribed to
          <br />
          <div className="text-xl font-bold text-primary pb-1">
            {PRODUCT_DEFINITION.name}
          </div>
          <div className="text-tertiary italic text-sm">
            {subscription?.status === "canceled"
              ? "Your subscription has ended"
              : subscription?.status === "canceling"
                ? `Access until ${renewalDate}`
                : `Renews ${renewalDate}`}
          </div>
        </div>
        <ButtonPrimary
          className="mx-auto"
          type="button"
          compact
          onClick={handleManageBilling}
          disabled={loading}
        >
          {loading ? <DotLoader /> : "Manage Billing"}
        </ButtonPrimary>
        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
};
