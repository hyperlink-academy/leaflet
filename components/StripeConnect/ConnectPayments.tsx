"use client";

import { useEffect, useMemo, useState } from "react";
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
import { InputSetting } from "components/SettingsLayout";
import {
  STRIPE_CONNECT_COUNTRIES,
  type StripeConnectCountry,
} from "stripe/connectCountries";

// Status + onboarding control for collecting payments via Stripe Connect.
export function ConnectPayments() {
  let { identity } = useIdentityData();
  let connected = identity?.connectedAccount ?? null;
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);
  let [country, setCountry] = useState<StripeConnectCountry | "">("");

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
      let result = await startStripeConnectOnboarding({
        returnUrl: window.location.href,
        country: country || undefined,
      });
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
  let needsCountry = !connected && !country;

  return (
    <>
      {!connected && (
        <CountryPicker
          value={country}
          disabled={loading}
          onChange={setCountry}
        />
      )}
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
          disabled={loading || needsEmail || needsCountry}
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

// Stripe fixes an account's country at creation, so it has to be chosen up
// front rather than inside the hosted onboarding flow.
function CountryPicker(props: {
  value: StripeConnectCountry | "";
  disabled?: boolean;
  onChange: (country: StripeConnectCountry | "") => void;
}) {
  let options = useMemo(() => {
    let names = new Intl.DisplayNames(undefined, { type: "region" });
    return STRIPE_CONNECT_COUNTRIES.map((code) => ({
      code,
      name: names.of(code) ?? code,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <InputSetting
      label="Country"
      htmlFor="stripe-connect-country"
      helpText="Where you or your business are based. This can't be changed once your Stripe account is created."
    >
      <select
        id="stripe-connect-country"
        className="input-with-border w-full text-primary"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) =>
          props.onChange(e.target.value as StripeConnectCountry | "")
        }
      >
        <option value="" disabled>
          Select a country
        </option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>
    </InputSetting>
  );
}
