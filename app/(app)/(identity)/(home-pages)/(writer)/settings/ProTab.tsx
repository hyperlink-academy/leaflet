"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { createBillingPortalSession } from "actions/createBillingPortalSession";
import { useIdentityData } from "components/IdentityProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useIsPro } from "src/hooks/useEntitlement";
import { UpgradeContent } from "app/(app)/(published)/lish/[did]/[publication]/UpgradeModal";
import { SettingsSection } from "components/SettingsLayout";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { GoToArrow } from "components/Icons/GoToArrow";

export const ProTab = () => {
  let isPro = useIsPro();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identity } = useIdentityData();

  const subscription = identity?.subscription;
  const renewalDate = useLocalizedDate(
    subscription?.current_period_end ||
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
  );

  const price = subscription?.plan;

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

  if (!isPro)
    return (
      <SettingsSection>
        <UpgradeContent />
      </SettingsSection>
    );

  return (
    <SettingsSection title="Your Pro Subscription">
      <div className="flex flex-col gap-2">
        {subscription?.status === "canceled" ? (
          "Your subscription has ended."
        ) : subscription?.status === "canceling" ? (
          `You have access until ${renewalDate}`
        ) : (
          <div className="flex flex-col gap-1">
            <div>
              Your subscription renews on <strong>{renewalDate}</strong>.
            </div>
            <div>
              You will be billed <strong>{price}</strong>.
            </div>
          </div>
        )}
        <button
          className="text-accent-contrast font-bold flex flex-row gap-2 items-center"
          onClick={handleManageBilling}
          disabled={loading}
        >
          {loading ? (
            <DotLoader />
          ) : (
            <>
              Manage <GoToArrow />
            </>
          )}
        </button>
      </div>

      {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
    </SettingsSection>
  );
};
