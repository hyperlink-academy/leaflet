import { supabaseServerClient } from "supabase/serverClient";

export async function handleInvoicePaymentFailed(subscriptionId: string) {
  if (subscriptionId) {
    await supabaseServerClient
      .from("user_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);

    // A given subscription id lives in exactly one of the two tables. past_due
    // memberships stop unlocking members-only content immediately.
    await supabaseServerClient
      .from("publication_memberships")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);
  }

  // Entitlements remain valid until expires_at
}
