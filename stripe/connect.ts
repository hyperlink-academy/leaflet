import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";

// Platform fee (basis points) taken from each payment a publisher collects.
// Applied as application_fee_amount when the actual payment flows are built;
// kept here so the rate lives in one place.
export const PLATFORM_FEE_BPS = 500; // 5%

export function platformFeeAmount(amountInCents: number): number {
  return Math.round((amountInCents * PLATFORM_FEE_BPS) / 10_000);
}

export type ConnectedAccountState = {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

// Create a Stripe Connect (Accounts v2) account configured as a merchant so the
// publisher can collect payments. Stripe is the fees/losses collector (the
// Express model); revisit defaults.responsibilities if we ever take on platform
// liability for negative balances.
export async function createConnectedMerchantAccount(args: {
  email: string;
  displayName?: string;
  identityId: string;
}) {
  return getStripe().v2.core.accounts.create({
    contact_email: args.email,
    display_name: args.displayName,
    // Country is required to onboard a merchant; defaulting to US until we
    // collect the publisher's real country for non-US payouts.
    identity: { country: "US" },
    configuration: {
      merchant: {
        capabilities: { card_payments: { requested: true } },
      },
    },
    dashboard: "express",
    defaults: {
      responsibilities: {
        fees_collector: "stripe",
        losses_collector: "stripe",
      },
    },
    metadata: { identity_id: args.identityId },
    include: ["configuration.merchant", "requirements"],
  });
}

// Single-use hosted onboarding link for the connected account.
export async function createOnboardingLink(args: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  return getStripe().v2.core.accountLinks.create({
    account: args.accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: args.refreshUrl,
        return_url: args.returnUrl,
      },
    },
  });
}

// Pull the account's current capability/requirements state from Stripe and
// persist it. We read via the v1 Accounts endpoint, which returns the familiar
// charges_enabled/payouts_enabled/details_submitted flags for v2 accounts too.
export async function syncConnectedAccountState(
  stripeAccountId: string,
): Promise<ConnectedAccountState> {
  const account = await getStripe().accounts.retrieve(stripeAccountId);
  const state: ConnectedAccountState = {
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
  };
  await supabaseServerClient
    .from("stripe_connected_accounts")
    .update({
      ...state,
      requirements: (account.requirements ?? null) as any,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", stripeAccountId);
  return state;
}
