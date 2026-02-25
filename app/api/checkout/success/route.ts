import { NextRequest, NextResponse } from "next/server";
import { stripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { parseEntitlements } from "stripe/products";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const returnUrl = req.nextUrl.searchParams.get("return") || "/";

  if (!sessionId) {
    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price.product"],
    });

    const identityId = session.client_reference_id;
    const customerId = session.customer as string;
    const sub =
      typeof session.subscription === "object" ? session.subscription : null;

    if (identityId && sub) {
      const priceItem = sub.items.data[0];
      const product =
        priceItem?.price.product &&
        typeof priceItem.price.product === "object" &&
        !("deleted" in priceItem.price.product)
          ? priceItem.price.product
          : null;
      const periodEnd = priceItem?.current_period_end ?? 0;

      // Optimistic upsert — idempotent with webhook handler
      await supabaseServerClient.from("user_subscriptions").upsert(
        {
          identity_id: identityId,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan: product?.name || "Leaflet Pro",
          status: sub.status,
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "identity_id" },
      );

      const entitlements = product
        ? parseEntitlements(product.metadata)
        : { publication_analytics: true };

      for (const key of Object.keys(entitlements)) {
        await supabaseServerClient.from("user_entitlements").upsert(
          {
            identity_id: identityId,
            entitlement_key: key,
            granted_at: new Date().toISOString(),
            expires_at: new Date(periodEnd * 1000).toISOString(),
            source: `stripe:${sub.id}`,
          },
          { onConflict: "identity_id,entitlement_key" },
        );
      }
    }
  } catch (err) {
    console.error("Error processing checkout success:", err);
  }

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
