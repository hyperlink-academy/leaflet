"use server";

import { getIdentityData } from "./getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import {
  createConnectedMerchantAccount,
  createOnboardingLink,
} from "stripe/connect";

export async function startStripeConnectOnboarding(
  returnUrl: string,
): Promise<Result<{ url: string }, string>> {
  const identity = await getIdentityData();
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
    const account = await createConnectedMerchantAccount({
      email: identity.email,
      displayName: identity.bsky_profiles?.handle || identity.email,
      identityId: identity.id,
    });
    stripeAccountId = account.id;
    const { error } = await supabaseServerClient
      .from("stripe_connected_accounts")
      .insert({
        identity_id: identity.id,
        stripe_account_id: stripeAccountId,
      });
    if (error) return Err("Failed to save connected account");
  }

  const link = await createOnboardingLink({
    accountId: stripeAccountId,
    refreshUrl: returnUrl,
    returnUrl,
  });
  return Ok({ url: link.url });
}
