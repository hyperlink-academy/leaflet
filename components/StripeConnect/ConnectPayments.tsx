"use client";

import { useEffect, useState } from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { DotLoader } from "components/utils/DotLoader";
import {
  useIdentityData,
  refreshIdentityData,
} from "components/IdentityProvider";
import { startStripeConnectOnboarding } from "actions/startStripeConnectOnboarding";
import { refreshStripeConnectAccount } from "actions/refreshStripeConnectAccount";
import { GoToArrow } from "components/Icons/GoToArrow";
import { AccountEmailForm } from "components/AccountEmailForm";

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

  let status = connected?.status ?? null;
  let needsEmail = !connected && !identity?.email;

  return (
    <>
      {status === "active" ? (
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-max flex gap-2 hover:no-underline items-center font-bold text-accent-contrast"
        >
          Stripe Dashboard
          <GoToArrow />
        </a>
      ) : status === "under_review" ? (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-primary">
            Your account is being reviewed
          </div>
          <div className="text-sm text-tertiary">
            You&apos;re all set — Stripe is verifying your details, which
            usually takes a few minutes to a couple of days.
          </div>
          <ButtonTertiary
            type="button"
            onClick={startOnboarding}
            disabled={loading}
          >
            {loading ? <DotLoader /> : "Check status on Stripe"}
          </ButtonTertiary>
        </div>
      ) : status === "rejected" ? (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-primary">
            Stripe couldn&apos;t approve your account
          </div>
          <div className="text-sm text-tertiary">
            Payments can&apos;t be enabled for this account. Check your{" "}
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe dashboard
            </a>{" "}
            for details.
          </div>
        </div>
      ) : (
        <ButtonPrimary
          className="w-max"
          type="button"
          onClick={startOnboarding}
          disabled={loading || needsEmail}
        >
          {loading ? (
            <DotLoader />
          ) : status === "onboarding_incomplete" ? (
            "Finish setting up payments"
          ) : (
            "Set up payments with Stripe"
          )}
        </ButtonPrimary>
      )}
      {needsEmail && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
          <div className="font-bold text-primary">
            First, add an email to your account
          </div>
          <AccountEmailForm helpText="Stripe uses this address for your payments account and receipts." />
        </div>
      )}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </>
  );
}
