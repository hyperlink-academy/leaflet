"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useIdentityData } from "components/IdentityProvider";
import { startStripeConnectOnboarding } from "actions/startStripeConnectOnboarding";
import { refreshStripeConnectAccount } from "actions/refreshStripeConnectAccount";

// Shared status + onboarding control for collecting payments via Stripe Connect.
// Rendered both in publication settings (Monetization) and account settings.
export function ConnectPayments() {
  let { identity } = useIdentityData();
  let connected = identity?.connectedAccount ?? null;
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);

  // Onboarding returns the user to the page they left; refresh a pending
  // account's status on mount so the UI reflects completion without waiting on
  // the webhook.
  useEffect(() => {
    if (connected && !connected.charges_enabled) {
      refreshStripeConnectAccount().then((r) => {
        if (r.ok) mutate("identity");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    let result = await startStripeConnectOnboarding(window.location.href);
    if (result.ok) {
      window.location.href = result.value.url;
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  let active = !!connected?.charges_enabled;
  let started = !!connected && !connected.charges_enabled;

  return (
    <div className="flex flex-col gap-2 text-secondary">
      <div className="text-sm">
        {active
          ? "Payments are enabled — readers can pay you, and Leaflet collects a small platform fee on each payment."
          : "Connect a Stripe account to collect payments from your readers. Leaflet takes a small platform fee on each payment."}
      </div>
      {!active && (
        <ButtonPrimary
          compact
          className="w-max"
          type="button"
          onClick={startOnboarding}
          disabled={loading}
        >
          {loading ? (
            <DotLoader />
          ) : started ? (
            "Finish setting up payments"
          ) : (
            "Set up payments"
          )}
        </ButtonPrimary>
      )}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
}
