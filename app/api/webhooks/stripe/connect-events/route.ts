import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "stripe/client";
import {
  handleMembershipSubscriptionEvent,
  handleMembershipInvoiceSucceeded,
  handleMembershipInvoiceFailed,
} from "./handlers";

// Connected-account events for direct-charge memberships. Configured in the
// Stripe dashboard to "listen on connected accounts", so event.account is the
// publisher's account and drives every follow-up API call. Distinct secret from
// the platform endpoint and the v2 account-status endpoint.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_EVENTS_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    console.error("Connect-events webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const stripeAccount = event.account;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await handleMembershipSubscriptionEvent(event.data.object, stripeAccount);
      break;
    }

    case "invoice.payment_succeeded": {
      const subId = subscriptionIdFromInvoice(event.data.object);
      if (subId && stripeAccount)
        await handleMembershipInvoiceSucceeded(subId, stripeAccount);
      break;
    }

    case "invoice.payment_failed": {
      const subId = subscriptionIdFromInvoice(event.data.object);
      if (subId && stripeAccount)
        await handleMembershipInvoiceFailed(subId, stripeAccount);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string {
  const sub = invoice.parent?.subscription_details?.subscription;
  return typeof sub === "string" ? sub : (sub?.id ?? "");
}
