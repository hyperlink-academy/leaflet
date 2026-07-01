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
    let account;
    try {
      account = await createConnectedMerchantAccount({
        email: identity.email,
        displayName: identity.bsky_profiles?.handle || identity.email,
        identityId: identity.id,
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
  }

  let link;
  try {
    link = await createOnboardingLink({
      accountId: stripeAccountId,
      refreshUrl: returnUrl,
      returnUrl,
    });
  } catch (e) {
    console.error("Stripe Connect onboarding link creation failed:", e);
    return Err("Couldn't set up payments. Please try again.");
  }
  return Ok({ url: link.url });
}
