import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { PRODUCT_DEFINITION, parseEntitlements } from "stripe/products";

export async function handleSubscriptionUpdated(subscriptionId: string) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
  const lookupKey = sub.items.data[0]?.price.lookup_key ?? null;
  const customerId = sub.customer as string;
  const status = sub.cancel_at_period_end ? "canceling" : sub.status;
  const metadataIdentityId = sub.metadata.identity_id ?? null;

  const entitlements = parseEntitlements(PRODUCT_DEFINITION.metadata);

  // Find the identity by stripe_customer_id
  const { data: existingSub } = await supabaseServerClient
    .from("user_subscriptions")
    .select("identity_id")
    .eq("stripe_customer_id", customerId)
    .single();

  const identityId = existingSub?.identity_id ?? metadataIdentityId;

  if (!identityId) {
    console.warn(
      `No subscription record for customer ${customerId} and no identity_id in metadata`,
    );
    return;
  }

  await supabaseServerClient.from("user_subscriptions").upsert(
    {
      identity_id: identityId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status,
      plan: lookupKey,
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "identity_id" },
  );

  for (const key of Object.keys(entitlements)) {
    await supabaseServerClient.from("user_entitlements").upsert(
      {
        identity_id: identityId,
        entitlement_key: key,
        granted_at: new Date().toISOString(),
        expires_at: new Date(periodEnd * 1000).toISOString(),
        source: `stripe:${sub.id}`,
      },
      { onConflict: "identity_id,entitlement_key" },
    );
  }
}
