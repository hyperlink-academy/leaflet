import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";

export const stripe_handle_subscription_deleted = inngest.createFunction(
  { id: "stripe-handle-subscription-deleted" },
  { event: "stripe/customer.subscription.deleted" },
  async ({ event, step }) => {
    await step.run("mark-subscription-canceled", async () => {
      await supabaseServerClient
        .from("user_subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", event.data.subscriptionId);
    });

    // Entitlements expire naturally via expires_at — no need to delete them
    return { success: true };
  },
);
