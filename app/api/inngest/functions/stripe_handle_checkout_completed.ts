import { inngest } from "../client";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { PRODUCT_DEFINITION, parseEntitlements } from "stripe/products";

export const stripe_handle_checkout_completed = inngest.createFunction(
  { id: "stripe-handle-checkout-completed" },
  { event: "stripe/checkout.session.completed" },
  async ({ event, step }) => {
    const session = await step.run("fetch-checkout-session", async () => {
      const s = await getStripe().checkout.sessions.retrieve(
        event.data.sessionId,
        { expand: ["subscription"] },
      );
      const sub =
        typeof s.subscription === "object" ? s.subscription : null;
      const periodEnd = sub?.items.data[0]?.current_period_end ?? 0;

      return {
        identityId: s.client_reference_id,
        customerId: s.customer as string,
        subId: sub?.id ?? null,
        subStatus: sub?.status ?? null,
        periodEnd,
      };
    });

    if (!session.identityId || !session.subId) {
      throw new Error("Missing client_reference_id or subscription");
    }

    await step.run("upsert-subscription-and-entitlements", async () => {
      const entitlements = parseEntitlements(PRODUCT_DEFINITION.metadata);

      await supabaseServerClient.from("user_subscriptions").upsert(
        {
          identity_id: session.identityId!,
          stripe_customer_id: session.customerId,
          stripe_subscription_id: session.subId!,
          plan: PRODUCT_DEFINITION.name,
          status: session.subStatus,
          current_period_end: new Date(
            session.periodEnd * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "identity_id" },
      );

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
