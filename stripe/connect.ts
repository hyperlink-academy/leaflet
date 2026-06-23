import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";

// Platform fee taken from each payment a publisher collects, applied as
// application_fee_amount on destination charges.
export const PLATFORM_FEE_BPS = 500; // 5%

export function platformFeeAmount(amountInCents: number): number {
  return Math.round((amountInCents * PLATFORM_FEE_BPS) / 10_000);
}

export type ConnectedAccountState = {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

// Stripe Connect (Accounts v2) merchant account so the publisher can collect
// payments. A "full" dashboard requires both fees_collector and losses_collector
// to be "stripe"; other combinations are rejected as
// account_controller_unsupported_configuration. The publisher owns the account
// and carries loss liability; our platform cut is independent (application_fee_amount).
export async function createConnectedMerchantAccount(args: {
  email: string;
  displayName?: string;
  identityId: string;
}) {
  return getStripe().v2.core.accounts.create({
    contact_email: args.email,
    display_name: args.displayName,
    // Required to onboard; default US until we collect the publisher's country.
    identity: { country: "US" },
    configuration: {
      merchant: {
        capabilities: { card_payments: { requested: true } },
      },
    },
    dashboard: "full",
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

// The v1 Accounts endpoint returns the familiar charges_enabled/payouts_enabled/
// details_submitted flags for v2 accounts too.
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
