import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "stripe/client";
import { inngest } from "app/api/inngest/client";
import { handleCheckoutCompleted } from "./handle_checkout_completed";
import { handleSubscriptionUpdated } from "./handle_subscription_updated";
import { handleSubscriptionDeleted } from "./handle_subscription_deleted";
import { handleInvoicePaymentFailed } from "./handle_invoice_payment_failed";

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
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const sessionId = event.data.object.id;
      await inngest.send({
        name: "stripe/checkout.session.completed",
        data: { sessionId },
      });
      await handleCheckoutCompleted(sessionId);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscriptionId = event.data.object.id;
      await inngest.send({
        name: "stripe/customer.subscription.updated",
        data: { subscriptionId },
      });
      await handleSubscriptionUpdated(subscriptionId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscriptionId = event.data.object.id;
      await inngest.send({
        name: "stripe/customer.subscription.deleted",
        data: { subscriptionId },
      });
      await handleSubscriptionDeleted(subscriptionId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const sub = invoice.parent?.subscription_details?.subscription;
      const subId =
        typeof sub === "string"
          ? sub
          : typeof sub === "object" && sub
            ? sub.id
            : "";
      await inngest.send({
        name: "stripe/invoice.payment.failed",
        data: {
          invoiceId: invoice.id,
          subscriptionId: subId,
          customerId: invoice.customer as string,
        },
      });
      await handleInvoicePaymentFailed(subId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
