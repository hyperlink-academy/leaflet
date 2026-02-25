"use server";

import { getIdentityData } from "./getIdentityData";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";

export async function reactivateSubscription(): Promise<
  Result<{ renewsAt: string }, string>
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

  await getStripe().subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Optimistic update
  await supabaseServerClient
    .from("user_subscriptions")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("identity_id", identity.id);

  return Ok({ renewsAt: sub.current_period_end || "" });
}
