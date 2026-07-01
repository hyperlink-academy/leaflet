import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "stripe/client";
import { syncConnectedAccountState } from "stripe/connect";

// Connect (Accounts v2) emits v2 events with their own signing secret, separate
// from the v1 webhook that handles platform (Leaflet Pro) billing.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let notification: Stripe.V2.Core.EventNotification;
  try {
    notification = getStripe().parseEventNotification(body, signature, secret);
  } catch (err) {
    console.error("Stripe Connect webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Account events carry the account in related_object; refetch and persist it.
  const related = (notification as Stripe.Events.UnknownEventNotification)
    .related_object;
  if (
    notification.type.startsWith("v2.core.account") &&
    related?.type === "account"
  ) {
    await syncConnectedAccountState(related.id);
  }

  return NextResponse.json({ received: true });
}
