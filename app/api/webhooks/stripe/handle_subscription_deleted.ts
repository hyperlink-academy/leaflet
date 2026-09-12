import { supabaseServerClient } from "supabase/serverClient";
import { trackUserEvent } from "src/activeUserAnalytics";
import { invalidateIdentitySlices } from "src/identitySlices";

export async function handleSubscriptionDeleted(subscriptionId: string) {
  const { data: proSub } = await supabaseServerClient
    .from("user_subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)
    .select("identity_id")
    .maybeSingle();
  if (proSub) {
    trackUserEvent({ id: proSub.identity_id }, "pro_cancel");
    await invalidateIdentitySlices(proSub.identity_id, ["billing"]);
  }

  // Entitlements expire naturally via expires_at — no need to delete them

  // A given subscription id lives in exactly one of the two tables, so both
  // updates are safe to run unconditionally. Canceling re-gates members-only
  // content for the reader.
  const { data: memberships } = await supabaseServerClient
    .from("publication_memberships")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)
    .select("identity_id");
  for (const m of memberships ?? [])
    await invalidateIdentitySlices(m.identity_id, ["subscriptions"]);
}
