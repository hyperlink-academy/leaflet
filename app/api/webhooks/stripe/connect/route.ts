import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "stripe/client";
import { syncConnectedAccountState } from "stripe/connect";
import {
  handleMembershipSubscriptionEvent,
  handleMembershipInvoiceSucceeded,
  handleMembershipInvoiceFailed,
} from "./handlers";

// Every event raised on publishers' connected accounts: account status and
// direct-charge membership billing. Configured in the Stripe dashboard to
// "listen on connected accounts", so event.account is the publisher's account
// and drives every follow-up API call. Separate signing secret from the
// platform (Leaflet Pro) billing endpoint, which only sees our own account.
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

  const stripeAccount = event.account;

  switch (event.type) {
    // The event payload is a point-in-time snapshot; refetch and persist
    // current state so out-of-order deliveries can't regress the stored flags.
    case "account.updated": {
      await syncConnectedAccountState(event.data.object.id);
      break;
    }

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
