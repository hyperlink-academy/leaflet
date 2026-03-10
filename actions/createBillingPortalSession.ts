"use server";

import { getIdentityData } from "./getIdentityData";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";

export async function createBillingPortalSession(
  returnUrl: string,
): Promise<Result<{ url: string }, string>> {
  const identity = await getIdentityData();
  if (!identity) {
    return Err("Not authenticated");
  }

  const { data: sub } = await supabaseServerClient
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("identity_id", identity.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return Err("No subscription found");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });

  return Ok({ url: session.url });
}
