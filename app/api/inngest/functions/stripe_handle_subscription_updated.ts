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

      return {
        id: sub.id,
        customerId: sub.customer as string,
        status: sub.cancel_at_period_end ? "canceling" : sub.status,
        periodEnd,
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

      if (!existingSub) {
        console.warn(
          `No subscription record for customer ${subData.customerId}`,
        );
        return;
      }

      // Update subscription record
      await supabaseServerClient
        .from("user_subscriptions")
        .update({
          status: subData.status,
          plan: PRODUCT_DEFINITION.name,
          current_period_end: new Date(
            subData.periodEnd * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("identity_id", existingSub.identity_id);

      // Update entitlement expiry dates for all entitlements from this subscription
      for (const key of Object.keys(entitlements)) {
        await supabaseServerClient
          .from("user_entitlements")
          .update({
            expires_at: new Date(
              subData.periodEnd * 1000,
            ).toISOString(),
          })
          .eq("identity_id", existingSub.identity_id)
          .eq("entitlement_key", key)
          .eq("source", `stripe:${subData.id}`);
      }
    });

    return { success: true };
  },
);
