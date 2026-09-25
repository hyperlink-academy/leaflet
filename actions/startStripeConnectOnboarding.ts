"use server";

import { getAuthIdentity } from "src/auth";
import { getProfiles } from "src/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import {
  createConnectedMerchantAccount,
  createOnboardingLink,
} from "stripe/connect";
import { isStripeConnectCountry } from "stripe/connectCountries";
import { trackUserEvent } from "src/activeUserAnalytics";

// `country` is only consulted when creating the account; it's fixed on Stripe's
// side afterwards, so later calls (resuming onboarding) ignore it.
export async function startStripeConnectOnboarding(args: {
  returnUrl: string;
  country?: string;
}): Promise<Result<{ url: string }, string>> {
  const identity = await getAuthIdentity();
  if (!identity) return Err("Not authenticated");
  if (!identity.email)
    return Err("Add an email to your account before setting up payments");

  // Reuse an existing connected account, or create one on first run.
  let stripeAccountId: string;
  const { data: existing } = await supabaseServerClient
    .from("stripe_connected_accounts")
    .select("stripe_account_id")
    .eq("identity_id", identity.id)
    .single();

  if (existing?.stripe_account_id) {
    stripeAccountId = existing.stripe_account_id;
  } else {
    if (!isStripeConnectCountry(args.country))
      return Err("Choose the country you're based in to set up payments");
    const handle = identity.atp_did
      ? (await getProfiles([identity.atp_did])).get(identity.atp_did)?.handle
      : undefined;
    let account;
    try {
      account = await createConnectedMerchantAccount({
        email: identity.email,
        displayName: handle || identity.email,
        identityId: identity.id,
        country: args.country,
      });
    } catch (e) {
      console.error("Stripe Connect account creation failed:", e);
      return Err("Couldn't set up payments. Please try again.");
    }
    stripeAccountId = account.id;
    // Upsert (ignore conflicts) so a concurrent request that already saved its
    // account id — which the idempotency key guarantees is the same one — leaves
    // this write as a no-op rather than a duplicate-key error.
    const { error } = await supabaseServerClient
      .from("stripe_connected_accounts")
      .upsert(
        {
          identity_id: identity.id,
          stripe_account_id: stripeAccountId,
        },
        { onConflict: "identity_id", ignoreDuplicates: true },
      );
    if (error) return Err("Failed to save connected account");
    trackUserEvent(identity, "connect_onboarding_started");
  }

  let link;
  try {
    link = await createOnboardingLink({
      accountId: stripeAccountId,
      refreshUrl: args.returnUrl,
      returnUrl: args.returnUrl,
    });
  } catch (e) {
    console.error("Stripe Connect onboarding link creation failed:", e);
    return Err("Couldn't set up payments. Please try again.");
  }
  return Ok({ url: link.url });
}
