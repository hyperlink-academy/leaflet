"use client";

import { useEffect, useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { DotLoader } from "components/utils/DotLoader";
import {
  useIdentityData,
  refreshIdentityData,
} from "components/IdentityProvider";
import { startStripeConnectOnboarding } from "actions/startStripeConnectOnboarding";
import { refreshStripeConnectAccount } from "actions/refreshStripeConnectAccount";
import { GoToArrow } from "components/Icons/GoToArrow";

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
        if (r.ok) refreshIdentityData();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    try {
      let result = await startStripeConnectOnboarding(window.location.href);
      if (result.ok) {
        // Keep `loading` set: we're navigating away, so the button should stay
        // disabled through the redirect.
        window.location.href = result.value.url;
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  let active = !!connected?.charges_enabled;
  let started = !!connected && !connected.charges_enabled;

  return (
    <>
      {active ? (
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-max flex gap-2 hover:no-underline items-center font-bold text-accent-contrast"
        >
          Stripe Dashboard
          <GoToArrow />
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
    </>
  );
}
