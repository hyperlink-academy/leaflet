import { inngest } from "../client";
import { supabaseServerClient } from "supabase/serverClient";

export const stripe_handle_invoice_payment_failed = inngest.createFunction(
  { id: "stripe-handle-invoice-payment-failed" },
  { event: "stripe/invoice.payment.failed" },
  async ({ event, step }) => {
    await step.run("mark-subscription-past-due", async () => {
      if (event.data.subscriptionId) {
        await supabaseServerClient
          .from("user_subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", event.data.subscriptionId);
      }
    });

    // Entitlements remain valid until expires_at
    return { success: true };
  },
);
