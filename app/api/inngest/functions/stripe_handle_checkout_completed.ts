import { inngest } from "../client";
import { stripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { parseEntitlements } from "stripe/products";

export const stripe_handle_checkout_completed = inngest.createFunction(
  { id: "stripe-handle-checkout-completed" },
  { event: "stripe/checkout.session.completed" },
  async ({ event, step }) => {
    const session = await step.run("fetch-checkout-session", async () => {
      const s = await stripe.checkout.sessions.retrieve(event.data.sessionId, {
        expand: ["subscription", "subscription.items.data.price.product"],
      });
      const sub =
        typeof s.subscription === "object" ? s.subscription : null;
      const priceItem = sub?.items.data[0];
      const product =
        priceItem?.price.product &&
        typeof priceItem.price.product === "object" &&
        !("deleted" in priceItem.price.product)
          ? priceItem.price.product
          : null;
      const periodEnd = priceItem?.current_period_end ?? 0;

      return {
        identityId: s.client_reference_id,
        customerId: s.customer as string,
        subId: sub?.id ?? null,
        subStatus: sub?.status ?? null,
        periodEnd,
        productName: product?.name || "Leaflet Pro",
        productMetadata: product?.metadata ?? null,
      };
    });

    if (!session.identityId || !session.subId) {
      throw new Error("Missing client_reference_id or subscription");
    }

    await step.run("upsert-subscription-and-entitlements", async () => {
      // Upsert user_subscriptions
      await supabaseServerClient.from("user_subscriptions").upsert(
        {
          identity_id: session.identityId!,
          stripe_customer_id: session.customerId,
          stripe_subscription_id: session.subId!,
          plan: session.productName,
          status: session.subStatus,
          current_period_end: new Date(
            session.periodEnd * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "identity_id" },
      );

      // Parse entitlements from product metadata and upsert
      const entitlements = session.productMetadata
        ? parseEntitlements(
            session.productMetadata as Record<string, string>,
          )
        : { publication_analytics: true };

      for (const key of Object.keys(entitlements)) {
        await supabaseServerClient.from("user_entitlements").upsert(
          {
            identity_id: session.identityId!,
            entitlement_key: key,
            granted_at: new Date().toISOString(),
            expires_at: new Date(
              session.periodEnd * 1000,
            ).toISOString(),
            source: `stripe:${session.subId}`,
          },
          { onConflict: "identity_id,entitlement_key" },
        );
      }
    });

    return { success: true };
  },
);
