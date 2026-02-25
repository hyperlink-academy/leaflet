"use server";

import { getIdentityData } from "./getIdentityData";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { getPriceId } from "stripe/products";
import { Ok, Err, type Result } from "src/result";

export async function createCheckoutSession(
  cadence: "month" | "year",
  returnUrl?: string,
): Promise<Result<{ url: string }, string>> {
  const identity = await getIdentityData();
  if (!identity) {
    return Err("Not authenticated");
  }

  const priceId = await getPriceId(cadence);
  if (!priceId) {
    return Err("No Stripe price found. Run the sync script first.");
  }

  // Check for existing Stripe customer
  let customerId: string | undefined;
  const { data: existingSub } = await supabaseServerClient
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("identity_id", identity.id)
    .single();

  if (existingSub?.stripe_customer_id) {
    customerId = existingSub.stripe_customer_id;
  }

  const successUrl = new URL(
    "/api/checkout/success",
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  if (returnUrl) {
    successUrl.searchParams.set("return", returnUrl);
  }

  const cancelUrl = returnUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: identity.id,
    ...(customerId
      ? { customer: customerId }
      : { customer_email: identity.email || undefined }),
    success_url: successUrl.toString(),
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    return Err("Failed to create checkout session");
  }

  return Ok({ url: session.url });
}
