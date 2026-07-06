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
// on the subscription id; events for subscriptions with no matching row fall
// through to reconcileUntrackedSubscription, which can rebuild the row from the
// subscription's metadata.
export async function handleMembershipSubscriptionEvent(
  sub: Stripe.Subscription,
  stripeAccount: string | undefined,
) {
  if (!isMembershipSub(sub)) return;
  const periodEnd = sub.items.data[0]?.current_period_end ?? 0;

  const { data: existing, error: readError } = await supabaseServerClient
    .from("publication_memberships")
    .select("id, status")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  // Throw so the route 500s and Stripe redelivers; treating a failed read as
  // "no row" would misroute the event into reconciliation.
  if (readError) throw readError;
  if (!existing) {
    await reconcileUntrackedSubscription(sub, stripeAccount);
    return;
  }

  const wasActive = isActiveStatus(existing.status);

  const { error: writeError } = await supabaseServerClient
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
  if (writeError) throw writeError;

  if (isActiveStatus(sub.status) && !wasActive) {
    await notifyNewMember(sub.metadata.publication, existing.id);
  }
}

// The join flow writes the membership row only after the Stripe subscription
// already exists, so a failed write — or a row deleted later, e.g. by an
// identity merge — leaves a live subscription billing the reader with no
// record, no access, and no way to cancel. The subscription's metadata carries
// everything needed to rebuild the row, making the webhook the reconciliation
// path of last resort.
async function reconcileUntrackedSubscription(
  eventSub: Stripe.Subscription,
  stripeAccount: string | undefined,
) {
  // Connected-account events always carry the account; without it we can't
  // even re-fetch the subscription.
  if (!stripeAccount) return;
  const { publication, tier_id, identity_id, cadence } = eventSub.metadata;
  if (!publication || !identity_id) {
    console.error(
      `[connect-events] membership subscription ${eventSub.id} has no publication/identity metadata; cannot reconcile`,
    );
    return;
  }

  // Event payloads are point-in-time snapshots and delivery order isn't
  // guaranteed; since we're about to (re)create state from scratch, act only
  // on the subscription's current truth.
  const sub = await getStripe().subscriptions.retrieve(eventSub.id, {
    stripeAccount,
  });
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return;

  const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
  const fields = {
    cadence: cadence ?? null,
    stripe_account_id: stripeAccount,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: sub.items.data[0]?.price.id ?? null,
    status: sub.status,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data: tracked, error: trackedError } = await supabaseServerClient
    .from("publication_memberships")
    .select("id, status, stripe_subscription_id")
    .eq("publication", publication)
    .eq("identity_id", identity_id)
    .maybeSingle();
  if (trackedError) throw trackedError;

  if (tracked) {
    // The reader's row tracks a different subscription. If that one is live,
    // don't clobber it — this event is either stale (a since-replaced
    // subscription) or evidence of duplicate live billing that needs manual
    // attention. If the tracked subscription is dead and this one is live,
    // this is the survivor: take the row over.
    if (isActiveStatus(tracked.status) || !isActiveStatus(sub.status)) {
      if (isActiveStatus(sub.status)) {
        console.error(
          `[connect-events] live membership subscription ${sub.id} (${publication}, identity ${identity_id}) is not the tracked subscription ${tracked.stripe_subscription_id}; possible duplicate billing`,
        );
      }
      return;
    }
    const { error } = await supabaseServerClient
      .from("publication_memberships")
      .update({ ...fields, tier: tier_id ?? null })
      .eq("id", tracked.id);
    if (error) throw error;
    await notifyNewMember(publication, tracked.id);
    return;
  }

  // FK guards: surface a permanently-unrecoverable insert loudly instead of
  // retry-looping on it. A missing identity means the subscription is billing
  // with no owner at all.
  const [identityRes, tierRes] = await Promise.all([
    supabaseServerClient
      .from("identities")
      .select("id")
      .eq("id", identity_id)
      .maybeSingle(),
    tier_id
      ? supabaseServerClient
          .from("publication_membership_tiers")
          .select("id")
          .eq("id", tier_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (identityRes.error) throw identityRes.error;
  if (tierRes.error) throw tierRes.error;
  if (!identityRes.data) {
    console.error(
      `[connect-events] membership subscription ${sub.id} references missing identity ${identity_id}; billing with no owner, needs manual cancellation`,
    );
    return;
  }

  const { data: inserted, error: insertError } = await supabaseServerClient
    .from("publication_memberships")
    .upsert(
      {
        publication,
        identity_id,
        tier: tierRes.data?.id ?? null,
        ...fields,
      },
      { onConflict: "publication,identity_id" },
    )
    .select("id")
    .single();
  if (insertError) throw insertError;

  if (isActiveStatus(sub.status)) {
    await notifyNewMember(publication, inserted.id);
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
