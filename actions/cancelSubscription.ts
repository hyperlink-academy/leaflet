"use server";

import { getIdentityData } from "./getIdentityData";
import { stripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";

export async function cancelSubscription(): Promise<
  Result<{ cancelAt: string }, string>
> {
  const identity = await getIdentityData();
  if (!identity) {
    return Err("Not authenticated");
  }

  const { data: sub } = await supabaseServerClient
    .from("user_subscriptions")
    .select("stripe_subscription_id, current_period_end")
    .eq("identity_id", identity.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    return Err("No active subscription found");
  }

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Optimistic update
  await supabaseServerClient
    .from("user_subscriptions")
    .update({
      status: "canceling",
      updated_at: new Date().toISOString(),
    })
    .eq("identity_id", identity.id);

  return Ok({ cancelAt: sub.current_period_end || "" });
}
