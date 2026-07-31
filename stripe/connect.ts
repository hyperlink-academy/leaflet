import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";

// Platform fee taken from each membership payment, applied as
// application_fee_percent on the publisher's direct-charge subscription.
export const PLATFORM_FEE_BPS = 500; // 5%

export type ConnectedAccountState = {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

// Stripe Connect (Accounts v1) merchant account so the publisher can collect
// payments. The controller properties are the Standard-account configuration:
// full dashboard, Stripe collects its fees from the account, and Stripe carries
// loss liability. The publisher owns the account; members are charged directly
// on it and our platform cut arrives as application fees
// (application_fee_percent).
export async function createConnectedMerchantAccount(args: {
  email: string;
  displayName?: string;
  identityId: string;
}) {
  return getStripe().accounts.create(
    {
      email: args.email,
      // Required to onboard; default US until we collect the publisher's country.
      country: "US",
      controller: {
        fees: { payer: "account" },
        losses: { payments: "stripe" },
        stripe_dashboard: { type: "full" },
      },
      // Stripe rejects card_payments unless transfers is requested with it,
      // even though we only take direct charges on the account.
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      ...(args.displayName
        ? { business_profile: { name: args.displayName } }
        : {}),
      metadata: { identity_id: args.identityId },
    },
    // Keyed on the identity so a retried or concurrent onboarding call returns
    // the account already created instead of orphaning a second one. The suffix
    // versions the request shape: replaying an older key against a changed
    // request body inside Stripe's idempotency window would error instead of
    // creating.
    { idempotencyKey: `connect-account-v1b-${args.identityId}` },
  );
}

// Single-use hosted onboarding link for the connected account.
export async function createOnboardingLink(args: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  return getStripe().accountLinks.create({
    account: args.accountId,
    type: "account_onboarding",
    refresh_url: args.refreshUrl,
    return_url: args.returnUrl,
  });
}

// Also works for accounts created via Accounts v2 before the v1 port: the v1
// Accounts endpoint returns the same charges_enabled/payouts_enabled/
// details_submitted flags for those.
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
