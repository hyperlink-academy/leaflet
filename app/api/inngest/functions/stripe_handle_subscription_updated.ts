import { inngest } from "../client";
import { stripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { parseEntitlements } from "stripe/products";

export const stripe_handle_subscription_updated = inngest.createFunction(
  { id: "stripe-handle-subscription-updated" },
  { event: "stripe/customer.subscription.updated" },
  async ({ event, step }) => {
    const subData = await step.run("fetch-subscription", async () => {
      const sub = await stripe.subscriptions.retrieve(
        event.data.subscriptionId,
        { expand: ["items.data.price.product"] },
      );
      const priceItem = sub.items.data[0];
      const product =
        priceItem?.price.product &&
        typeof priceItem.price.product === "object" &&
        !("deleted" in priceItem.price.product)
          ? priceItem.price.product
          : null;
      const periodEnd = priceItem?.current_period_end ?? 0;

      return {
        id: sub.id,
        customerId: sub.customer as string,
        status: sub.status,
        periodEnd,
        productName: product?.name || "Leaflet Pro",
        productMetadata: product?.metadata ?? null,
      };
    });

    await step.run("update-subscription-and-entitlements", async () => {
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
          plan: subData.productName,
          current_period_end: new Date(
            subData.periodEnd * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("identity_id", existingSub.identity_id);

      // Update entitlement expiry dates for all entitlements from this subscription
      const entitlements = subData.productMetadata
        ? parseEntitlements(
            subData.productMetadata as Record<string, string>,
          )
        : {};
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
