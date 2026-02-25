import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { PRODUCT_DEFINITION, parseEntitlements } from "stripe/products";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const returnUrl = req.nextUrl.searchParams.get("return") || "/";

  if (!sessionId) {
    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const identityId = session.client_reference_id;
    const customerId = session.customer as string;
    const sub =
      typeof session.subscription === "object" ? session.subscription : null;

    if (identityId && sub) {
      const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
      const entitlements = parseEntitlements(PRODUCT_DEFINITION.metadata);

      // Optimistic upsert — idempotent with webhook handler
      await supabaseServerClient.from("user_subscriptions").upsert(
        {
          identity_id: identityId,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan: PRODUCT_DEFINITION.name,
          status: sub.status,
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "identity_id" },
      );

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
