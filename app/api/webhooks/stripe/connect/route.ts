import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "stripe/client";
import { syncConnectedAccountState } from "stripe/connect";

// Connect account-status events (account.updated on connected accounts), with
// their own signing secret, separate from the v1 webhook that handles platform
// (Leaflet Pro) billing and the connect-events endpoint for membership billing.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Stripe Connect webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // The event payload is a point-in-time snapshot; refetch and persist current
  // state so out-of-order deliveries can't regress the stored flags.
  if (event.type === "account.updated") {
    await syncConnectedAccountState(event.data.object.id);
  }

  return NextResponse.json({ received: true });
}
