"use client";
import { useEffect, useRef, useState } from "react";
import {
  loadStripe,
  type Stripe as StripeJs,
  type Appearance,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import {
  createWalletSetupIntent,
  type WalletSetupIntent,
} from "actions/walletPayment";

// The embedded card form for the platform wallet: Stripe's Payment Element
// confirming a SetupIntent on the reader's wallet customer. Saved payment
// methods are listed for the reader to pick from (via the CustomerSession the
// server action mints), Link rides along card-backed, and 3DS challenges are
// handled inline by Stripe.js — the reader never leaves the page.
//
// On a confirmed setup, `onSuccess` receives the SetupIntent id; the caller
// owns persisting it (saveWalletCardFromSetupIntent / updateWalletCardFrom-
// SetupIntent) and whatever comes next (charging the join, closing a modal).
// The form keeps its spinner up while onSuccess runs.

let stripeJs: Promise<StripeJs | null> | null = null;
const getStripeJs = (publishableKey: string) =>
  (stripeJs ??= loadStripe(publishableKey));

export function WalletPaymentForm(props: {
  submitLabel: string;
  // Prefills the element's email so Link recognizes returning readers
  // immediately instead of asking them to type it.
  email?: string | null;
  onSuccess: (setupIntentId: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [intent, setIntent] = useState<WalletSetupIntent | null>(null);
  const [failed, setFailed] = useState(false);
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const themeProbe = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    createWalletSetupIntent().then((res) => {
      if (cancelled) return;
      if (res.ok) setIntent(res.value);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The Payment Element renders in Stripe-hosted iframes, so the page's theme
  // CSS variables can't cascade into it — resolve them where this form mounts
  // (inside the themed modal) and hand Stripe concrete colors.
  useEffect(() => {
    if (!themeProbe.current) return;
    const styles = getComputedStyle(themeProbe.current);
    const themeVar = (name: string) => {
      const triplet = styles.getPropertyValue(name).trim();
      return triplet ? `rgb(${triplet})` : undefined;
    };
    setAppearance({
      theme: "stripe",
      variables: {
        colorPrimary: themeVar("--accent-contrast"),
        colorText: themeVar("--primary"),
        colorBackground: themeVar("--bg-page"),
        borderRadius: "4px",
      },
    });
  }, []);

  if (failed)
    return (
      <div className="text-center text-secondary py-4">
        We couldn't load the payment form. Please try again!
      </div>
    );

  return (
    <div ref={themeProbe} className="flex flex-col gap-3">
      {!intent || !appearance ? (
        <div className="flex justify-center py-8">
          <DotLoader />
        </div>
      ) : (
        <Elements
          stripe={getStripeJs(intent.publishableKey)}
          options={{
            clientSecret: intent.clientSecret,
            customerSessionClientSecret: intent.customerSessionClientSecret,
            appearance,
          }}
        >
          <SetupForm
            submitLabel={props.submitLabel}
            email={props.email}
            onSuccess={props.onSuccess}
            onCancel={props.onCancel}
          />
        </Elements>
      )}
    </div>
  );
}

function SetupForm(props: {
  submitLabel: string;
  email?: string | null;
  onSuccess: (setupIntentId: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    const result = await stripe.confirmSetup({
      elements,
      // Cards (Link included) confirm inline; the return_url only matters for
      // the redirect-based edge cases if_required can't avoid.
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
    if (result.error) {
      setError(
        result.error.message ??
          "We couldn't save your payment method. Please try again!",
      );
      setBusy(false);
      return;
    }
    if (result.setupIntent.status !== "succeeded") {
      setError("We couldn't save your payment method. Please try again!");
      setBusy(false);
      return;
    }
    await props.onSuccess(result.setupIntent.id);
    // If onSuccess didn't navigate away, let the form be used again.
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <PaymentElement
        onReady={() => setReady(true)}
        options={
          props.email
            ? { defaultValues: { billingDetails: { email: props.email } } }
            : undefined
        }
      />
      {error && (
        <p className="text-accent-contrast text-sm text-center font-bold">
          {error}
        </p>
      )}
      {ready && (
        <div className="flex flex-col gap-2">
          <ButtonPrimary type="submit" disabled={busy} fullWidth>
            {busy ? <DotLoader /> : props.submitLabel}
          </ButtonPrimary>
          {props.onCancel && (
            <button
              type="button"
              className="text-tertiary text-sm hover:underline"
              onClick={props.onCancel}
              disabled={busy}
            >
              Back
            </button>
          )}
        </div>
      )}
    </form>
  );
}
