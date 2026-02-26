import { inngest } from "../client";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { PRODUCT_DEFINITION, parseEntitlements } from "stripe/products";

export const stripe_handle_subscription_updated = inngest.createFunction(
  { id: "stripe-handle-subscription-updated" },
  { event: "stripe/customer.subscription.updated" },
  async ({ event, step }) => {
    const subData = await step.run("fetch-subscription", async () => {
      const sub = await getStripe().subscriptions.retrieve(
        event.data.subscriptionId,
      );
      const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
      const lookupKey = sub.items.data[0]?.price.lookup_key ?? null;

      return {
        id: sub.id,
        customerId: sub.customer as string,
        status: sub.cancel_at_period_end ? "canceling" : sub.status,
        periodEnd,
        lookupKey,
        metadataIdentityId: sub.metadata.identity_id ?? null,
      };
    });

    await step.run("update-subscription-and-entitlements", async () => {
      const entitlements = parseEntitlements(PRODUCT_DEFINITION.metadata);

      // Find the identity by stripe_customer_id
      const { data: existingSub } = await supabaseServerClient
        .from("user_subscriptions")
        .select("identity_id")
        .eq("stripe_customer_id", subData.customerId)
        .single();

      const identityId = existingSub?.identity_id ?? subData.metadataIdentityId;

      if (!identityId) {
        console.warn(
          `No subscription record for customer ${subData.customerId} and no identity_id in metadata`,
        );
        return;
      }

      // Upsert subscription record
      await supabaseServerClient
        .from("user_subscriptions")
        .upsert(
          {
            identity_id: identityId,
            stripe_customer_id: subData.customerId,
            stripe_subscription_id: subData.id,
            status: subData.status,
            plan: subData.lookupKey,
            current_period_end: new Date(
              subData.periodEnd * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "identity_id" },
        );

      // Upsert entitlements for all entitlements from this subscription
      for (const key of Object.keys(entitlements)) {
        await supabaseServerClient.from("user_entitlements").upsert(
          {
            identity_id: identityId,
            entitlement_key: key,
            granted_at: new Date().toISOString(),
            expires_at: new Date(subData.periodEnd * 1000).toISOString(),
            source: `stripe:${subData.id}`,
          },
          { onConflict: "identity_id,entitlement_key" },
        );
      }
    });

    return { success: true };
  },
);
