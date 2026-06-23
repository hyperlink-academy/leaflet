"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import { ButtonPrimary } from "components/Buttons";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { DotLoader } from "components/utils/DotLoader";
import { useIdentityData } from "components/IdentityProvider";
import { startStripeConnectOnboarding } from "actions/startStripeConnectOnboarding";
import { refreshStripeConnectAccount } from "actions/refreshStripeConnectAccount";

// Status + onboarding control for collecting payments via Stripe Connect.
export function ConnectPayments() {
  let { identity } = useIdentityData();
  let connected = identity?.connectedAccount ?? null;
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);

  // Refresh a pending account's status on mount so returning from onboarding
  // reflects completion without waiting on the webhook.
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
      {active ? (
        // Merchant accounts have their own full Stripe dashboard; the publisher
        // logs in with their own credentials, so a static link is all we hand off.
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-max flex gap-1 items-center font-bold text-accent-contrast"
        >
          Manage on Stripe
          <ExternalLinkTiny />
        </a>
      ) : (
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
