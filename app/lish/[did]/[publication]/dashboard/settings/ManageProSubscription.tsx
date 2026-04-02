import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { createBillingPortalSession } from "actions/createBillingPortalSession";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { PRODUCT_DEFINITION } from "stripe/products";

export const ManageProSubscription = (props: {}) => {
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

  return (
    <div>
      <div className="text-secondary text-center flex flex-col justify-center gap-2 py-2">
        <div>
          You have a <br />
          {PRODUCT_DEFINITION.name} subscription
          <div className="text-lg font-bold text-primary">
            {PRODUCT_DEFINITION.name}
          </div>
          {subscription?.status === "canceled"
            ? "Your subscription has ended"
            : subscription?.status === "canceling"
              ? `Access until ${renewalDate}`
              : `Renews on ${renewalDate}`}
        </div>
        <ButtonPrimary
          className="mx-auto"
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
