"use server";

import { getAuthIdentity } from "src/auth";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";

export async function getUpcomingInvoice(): Promise<
  Result<{ amount_due: number; currency: string }, string>
> {
  const identity = await getAuthIdentity();
  if (!identity) {
    return Err("Not authenticated");
  }

  const { data: sub } = await supabaseServerClient
    .from("user_subscriptions")
    .select("stripe_subscription_id")
    .eq("identity_id", identity.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    return Err("No subscription found");
  }

  try {
    const invoice = await getStripe().invoices.createPreview({
      subscription: sub.stripe_subscription_id,
    });
    return Ok({ amount_due: invoice.amount_due, currency: invoice.currency });
  } catch (e) {
    // Stripe refuses to preview an invoice for a subscription that won't
    // renew (canceled or fully ended), which is expected here.
    return Err("No upcoming invoice");
  }
}
