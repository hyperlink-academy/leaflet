import { NextRequest, NextResponse } from "next/server";
import { stripe } from "stripe/client";
import { inngest } from "app/api/inngest/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await inngest.send({
        name: "stripe/checkout.session.completed",
        data: { sessionId: event.data.object.id },
      });
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await inngest.send({
        name: "stripe/customer.subscription.updated",
        data: { subscriptionId: event.data.object.id },
      });
      break;

    case "customer.subscription.deleted":
      await inngest.send({
        name: "stripe/customer.subscription.deleted",
        data: { subscriptionId: event.data.object.id },
      });
      break;

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subDetails = invoice.parent?.subscription_details;
      const subId =
        typeof subDetails?.subscription === "string"
          ? subDetails.subscription
          : subDetails?.subscription?.id || "";
      await inngest.send({
        name: "stripe/invoice.payment.failed",
        data: {
          invoiceId: invoice.id,
          subscriptionId: subId,
          customerId: invoice.customer as string,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
