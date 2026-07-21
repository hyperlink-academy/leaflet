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

  // A given subscription id lives in exactly one of the two tables, so both
  // updates are safe to run unconditionally. Canceling re-gates members-only
  // content for the reader.
  await supabaseServerClient
    .from("publication_memberships")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}
