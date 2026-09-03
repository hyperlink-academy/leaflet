"use server";

import { getAuthIdentity } from "src/auth";
import { getStripe } from "stripe/client";
import {
  getOrCreateWallet,
  saveWalletCard,
  walletSetupIntentCard,
} from "stripe/wallet";
import { Ok, Err, type Result } from "src/result";

type WalletPaymentError = "not_authenticated" | "stripe_error";

export type WalletSetupIntent = {
  clientSecret: string;
  customerSessionClientSecret: string;
  publishableKey: string;
};

// Backs the embedded card form (WalletPaymentForm): a SetupIntent on the
// reader's platform wallet customer, confirmed client-side by the Payment
// Element, plus a CustomerSession so the element lists the wallet's saved
// payment methods for the reader to pick from.
//
// Card-only on purpose — with `payment_method_types: ["card"]` and no "link",
// Link runs card-backed: its PaymentMethods come back with type "card"
// (wallet.type "link"), which is what lets the saved method be cloned onto
// publishers' connected accounts for direct charges. A "link"-type
// PaymentMethod cannot be cloned (Stripe supports cloning only "card" and
// "us_bank_account"), so adding "link" here would break membership billing.
export async function createWalletSetupIntent(): Promise<
  Result<WalletSetupIntent, WalletPaymentError>
> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error(
      "[walletPayment] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set",
    );
    return Err("stripe_error");
  }
  try {
    const wallet = await getOrCreateWallet(identity);
    const stripe = getStripe();
    const [setupIntent, customerSession] = await Promise.all([
      stripe.setupIntents.create({
        customer: wallet.stripe_customer_id,
        payment_method_types: ["card"],
        usage: "off_session",
      }),
      stripe.customerSessions.create({
        customer: wallet.stripe_customer_id,
        components: {
          payment_element: {
            enabled: true,
            features: {
              payment_method_redisplay: "enabled",
              // Cards saved through the old hosted-checkout flow have
              // allow_redisplay "unspecified"; without this filter they'd be
              // invisible in the element.
              payment_method_allow_redisplay_filters: [
                "always",
                "limited",
                "unspecified",
              ],
            },
          },
        },
      }),
    ]);
    if (!setupIntent.client_secret) return Err("stripe_error");
    return Ok({
      clientSecret: setupIntent.client_secret,
      customerSessionClientSecret: customerSession.client_secret,
      publishableKey,
    });
  } catch (e) {
    console.error("[walletPayment] setup intent failed:", e);
    return Err("stripe_error");
  }
}

// Called after the Payment Element confirms the SetupIntent: make the chosen
// payment method the wallet default. Verifies the intent belongs to the
// caller's own wallet customer (the id comes from the client).
export async function saveWalletCardFromSetupIntent(
  setupIntentId: string,
): Promise<Result<null, WalletPaymentError>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("not_authenticated");
  try {
    const [wallet, card] = await Promise.all([
      getOrCreateWallet(identity),
      walletSetupIntentCard(setupIntentId),
    ]);
    if (!card || card.customerId !== wallet.stripe_customer_id)
      return Err("stripe_error");
    await saveWalletCard(identity.id, card.pmId);
    return Ok(null);
  } catch (e) {
    console.error("[walletPayment] save card from setup intent failed:", e);
    return Err("stripe_error");
  }
}
