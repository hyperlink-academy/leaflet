import { supabaseServerClient } from "supabase/serverClient";

export async function handleSubscriptionDeleted(subscriptionId: string) {
  await supabaseServerClient
    .from("user_subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  // Entitlements expire naturally via expires_at — no need to delete them
}
