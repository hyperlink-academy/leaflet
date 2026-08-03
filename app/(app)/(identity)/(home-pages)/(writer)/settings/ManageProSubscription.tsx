"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { createBillingPortalSession } from "actions/createBillingPortalSession";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

export const ManageProSubscription = () => {
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
    <div className="text-secondary font-bold flex flex-col gap-1 justify-end">
      <ButtonPrimary compact onClick={handleManageBilling} disabled={loading}>
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
};
