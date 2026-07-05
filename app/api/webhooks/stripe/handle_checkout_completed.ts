import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { PRODUCT_DEFINITION, parseEntitlements } from "stripe/products";

export async function handleCheckoutCompleted(sessionId: string) {
  const s = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  const sub = typeof s.subscription === "object" ? s.subscription : null;
  const periodEnd = sub?.items.data[0]?.current_period_end ?? 0;
  const lookupKey = sub?.items.data[0]?.price.lookup_key ?? null;
  const identityId = s.client_reference_id;
  const customerId = s.customer as string;
  const subId = sub?.id ?? null;
  const subStatus = sub?.status ?? null;

  if (!identityId || !subId) {
    throw new Error("Missing client_reference_id or subscription");
  }

  // Publication membership checkouts (reader → publisher, destination charge)
  // settle on the platform account too; they're disambiguated from Leaflet Pro
  // by metadata.kind.
  if (s.metadata?.kind === "publication_membership") {
    const publication = s.metadata.publication;
    if (!publication) throw new Error("Membership checkout missing publication");
    await supabaseServerClient.from("publication_memberships").upsert(
      {
        publication,
        identity_id: identityId,
        tier: s.metadata.tier_id || null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subId,
        status: subStatus,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        cancel_at_period_end: sub?.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "publication,identity_id" },
    );
    return;
  }

  const entitlements = parseEntitlements(PRODUCT_DEFINITION.metadata);

  await supabaseServerClient.from("user_subscriptions").upsert(
    {
      identity_id: identityId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      plan: lookupKey,
      status: subStatus,
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
        source: `stripe:${subId}`,
      },
      { onConflict: "identity_id,entitlement_key" },
    );
  }
}
