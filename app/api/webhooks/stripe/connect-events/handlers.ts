import type Stripe from "stripe";
import { render } from "@react-email/render";
import { AtUri } from "@atproto/syntax";
import { v7 } from "uuid";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import {
  type Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import MembershipPaymentFailed from "emails/membershipPaymentFailed";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";

function isMembershipSub(sub: Stripe.Subscription): boolean {
  return sub.metadata?.kind === "publication_membership";
}

function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

// Reconcile a membership row from a connected-account subscription event. Keyed
// on the subscription id, so a stale event for a since-replaced subscription
// (cancel-and-recreate) matches no row and is a harmless no-op.
export async function handleMembershipSubscriptionEvent(
  sub: Stripe.Subscription,
  stripeAccount: string | undefined,
) {
  if (!isMembershipSub(sub)) return;
  const periodEnd = sub.items.data[0]?.current_period_end ?? 0;

  const { data: existing } = await supabaseServerClient
    .from("publication_memberships")
    .select("id, status")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (!existing) return;

  const wasActive = isActiveStatus(existing.status);

  await supabaseServerClient
    .from("publication_memberships")
    .update({
      status: sub.status,
      stripe_account_id: stripeAccount ?? undefined,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);

  if (isActiveStatus(sub.status) && !wasActive) {
    await notifyNewMember(sub.metadata.publication, existing.id);
  }
}

export async function handleMembershipInvoiceSucceeded(
  subscriptionId: string,
  stripeAccount: string,
) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
    stripeAccount,
  });
  await handleMembershipSubscriptionEvent(sub, stripeAccount);
}

export async function handleMembershipInvoiceFailed(
  subscriptionId: string,
  stripeAccount: string,
) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
    stripeAccount,
  });
  if (!isMembershipSub(sub)) return;

  // No grace period: a failed renewal re-gates members-only content immediately
  // (isActiveMembership treats past_due as inactive); Stripe retries then cancels.
  await supabaseServerClient
    .from("publication_memberships")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id);

  await sendPaymentFailedEmail(sub);
}

async function notifyNewMember(
  publication: string | undefined,
  membershipId: string,
) {
  if (!publication) return;
  const recipient = new AtUri(publication).host;
  const notification: Notification = {
    id: v7(),
    recipient,
    data: { type: "new_member", publication, membership_id: membershipId },
  };
  await supabaseServerClient.from("notifications").insert(notification);
  await pingIdentityToUpdateNotification(recipient);
}

async function sendPaymentFailedEmail(sub: Stripe.Subscription) {
  const publication = sub.metadata.publication;
  const identityId = sub.metadata.identity_id;
  if (!identityId) return;

  const [{ data: identity }, { data: pub }] = await Promise.all([
    supabaseServerClient
      .from("identities")
      .select("email")
      .eq("id", identityId)
      .maybeSingle(),
    publication
      ? supabaseServerClient
          .from("publications")
          .select("name")
          .eq("uri", publication)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!identity?.email) return;

  const updateCardUrl = new URL("/memberships", APP_URL).toString();
  const publicationName = pub?.name ?? undefined;

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[membershipPaymentFailed] would email ${identity.email} for ${publicationName}`,
    );
    return;
  }

  const html = await render(
    MembershipPaymentFailed({ publicationName, updateCardUrl }),
  );
  await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify({
      From: "Leaflet <accounts@leaflet.pub>",
      Subject: `Your membership payment didn't go through`,
      To: identity.email,
      TextBody: `We couldn't renew your membership${
        publicationName ? ` for ${publicationName}` : ""
      }. Update your card to restore access: ${updateCardUrl}`,
      HtmlBody: html,
    }),
  }).catch((e) =>
    console.error("[membershipPaymentFailed] postmark send failed:", e),
  );
}
