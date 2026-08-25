import type Stripe from "stripe";
import { render } from "@react-email/render";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { notifyNewMember } from "src/membership.server";
import { ensureSubscriberRecordsForMembership } from "src/subscriptions/membership";
import MembershipPaymentFailed from "emails/membershipPaymentFailed";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";

function isMembershipSub(sub: Stripe.Subscription): boolean {
  return sub.metadata?.kind === "publication_membership";
}

function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

// A membership activated by webhook needs the same subscriber mirroring the
// inline join flow does.
async function mirrorSubscriberRecords(
  identityId: string,
  publication: string,
) {
  const { data: identity } = await supabaseServerClient
    .from("identities")
    .select("id, email, atp_did")
    .eq("id", identityId)
    .maybeSingle();
  if (!identity) return;
  await ensureSubscriberRecordsForMembership(publication, identity, null, {
    respectUnsubscribed: true,
  });
}

// Reconcile a membership row from a connected-account subscription event. Keyed
// on the subscription id; events for subscriptions with no matching row fall
// through to reconcileUntrackedSubscription, which can rebuild the row from the
// subscription's metadata.
export async function handleMembershipSubscriptionEvent(
  sub: Stripe.Subscription,
  stripeAccount: string | undefined,
  opts?: { fresh?: boolean },
) {
  if (!isMembershipSub(sub)) return;

  const { data: existing, error: readError } = await supabaseServerClient
    .from("publication_memberships")
    .select("id, status, publication, pending_tier, pending_cadence")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  // Throw so the route 500s and Stripe redelivers; treating a failed read as
  // "no row" would misroute the event into reconciliation.
  if (readError) throw readError;
  if (!existing) {
    await reconcileUntrackedSubscription(sub, stripeAccount);
    return;
  }

  // Event payloads are point-in-time snapshots and delivery order isn't
  // guaranteed — a delayed `updated` (active) processed after `deleted`
  // (canceled) would resurrect the membership. Write the subscription's
  // current truth instead, unless the caller already re-fetched it.
  if (!opts?.fresh && stripeAccount) {
    sub = await getStripe().subscriptions.retrieve(sub.id, { stripeAccount });
  }
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ?? 0;

  const wasActive = isActiveStatus(existing.status);

  // The billed price is the tier of record: a scheduled downgrade swaps it at
  // the period boundary with no call back into the app.
  const plan = item
    ? await planForPrice(existing.publication, item.price)
    : null;
  const pendingApplied =
    !sub.schedule ||
    (!!plan &&
      plan.tier === existing.pending_tier &&
      plan.cadence === existing.pending_cadence);

  const { error: writeError } = await supabaseServerClient
    .from("publication_memberships")
    .update({
      status: sub.status,
      stripe_account_id: stripeAccount ?? undefined,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      ...(plan ?? {}),
      ...(pendingApplied ? { pending_tier: null, pending_cadence: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
  if (writeError) throw writeError;

  if (isActiveStatus(sub.status) && !wasActive) {
    await notifyNewMember(sub.metadata.publication, existing.id);
    if (sub.metadata.publication && sub.metadata.identity_id)
      await mirrorSubscriberRecords(
        sub.metadata.identity_id,
        sub.metadata.publication,
      );
  }
}

// Resolves the tier a subscription item's price belongs to. A price no tier
// claims (e.g. one retired before the member was repriced) keeps the row's
// current tier.
async function planForPrice(publication: string, price: Stripe.Price) {
  const { data: tier, error } = await supabaseServerClient
    .from("publication_membership_tiers")
    .select("id")
    .eq("publication", publication)
    .or(
      `stripe_price_monthly_id.eq.${price.id},stripe_price_annual_id.eq.${price.id}`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!tier) return null;
  return {
    tier: tier.id,
    cadence: price.recurring?.interval ?? null,
    stripe_price_id: price.id,
  };
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
  if (!publication || !identity_id || !tier_id) {
    console.error(
      `[connect-events] membership subscription ${eventSub.id} has incomplete publication/identity/tier metadata; cannot reconcile`,
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

  const [{ data: tracked, error: trackedError }, tierRes] = await Promise.all([
    supabaseServerClient
      .from("publication_memberships")
      .select("id, status, stripe_subscription_id")
      .eq("publication", publication)
      .eq("identity_id", identity_id)
      .maybeSingle(),
    supabaseServerClient
      .from("publication_membership_tiers")
      .select("id")
      .eq("id", tier_id)
      .eq("publication", publication)
      .maybeSingle(),
  ]);
  if (trackedError) throw trackedError;
  if (tierRes.error) throw tierRes.error;
  if (!tierRes.data) {
    console.error(
      `[connect-events] membership subscription ${sub.id} references missing tier ${tier_id} for ${publication}; cannot reconcile`,
    );
    return;
  }

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
      .update({ ...fields, tier: tierRes.data.id })
      .eq("id", tracked.id);
    if (error) throw error;
    await notifyNewMember(publication, tracked.id);
    await mirrorSubscriberRecords(identity_id, publication);
    return;
  }

  // FK guards: surface a permanently-unrecoverable insert loudly instead of
  // retry-looping on it. A missing identity means the subscription is billing
  // with no owner at all.
  const [identityRes, pubRes] = await Promise.all([
    supabaseServerClient
      .from("identities")
      .select("id")
      .eq("id", identity_id)
      .maybeSingle(),
    supabaseServerClient
      .from("publications")
      .select("uri")
      .eq("uri", publication)
      .maybeSingle(),
  ]);
  if (identityRes.error) throw identityRes.error;
  if (pubRes.error) throw pubRes.error;
  if (!identityRes.data) {
    console.error(
      `[connect-events] membership subscription ${sub.id} references missing identity ${identity_id}; billing with no owner, needs manual cancellation`,
    );
    return;
  }
  if (!pubRes.data) {
    console.error(
      `[connect-events] membership subscription ${sub.id} references deleted publication ${publication}; billing for nothing, needs manual cancellation`,
    );
    return;
  }

  const { data: inserted, error: insertError } = await supabaseServerClient
    .from("publication_memberships")
    .upsert(
      {
        publication,
        identity_id,
        tier: tierRes.data.id,
        ...fields,
      },
      { onConflict: "publication,identity_id" },
    )
    .select("id")
    .single();
  if (insertError) throw insertError;

  if (isActiveStatus(sub.status)) {
    await notifyNewMember(publication, inserted.id);
    await mirrorSubscriberRecords(identity_id, publication);
  }
}

export async function handleMembershipInvoiceSucceeded(
  subscriptionId: string,
  stripeAccount: string,
) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
    stripeAccount,
  });
  await handleMembershipSubscriptionEvent(sub, stripeAccount, { fresh: true });
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
  // Write the re-fetched status rather than assuming past_due — a replayed or
  // out-of-order event can arrive after the subscription already recovered.
  const { error } = await supabaseServerClient
    .from("publication_memberships")
    .update({ status: sub.status, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw error;

  if (!isActiveStatus(sub.status)) {
    await sendPaymentFailedEmail(sub);
  }
}

async function sendPaymentFailedEmail(sub: Stripe.Subscription) {
  const publication = sub.metadata.publication;
  const identityId = sub.metadata.identity_id;
  if (!identityId) return;

  const [identityRes, pubRes] = await Promise.all([
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
      : Promise.resolve({ data: null, error: null }),
  ]);
  // Throw so Stripe redelivers rather than silently dropping the email.
  if (identityRes.error) throw identityRes.error;
  if (pubRes.error) throw pubRes.error;
  const identity = identityRes.data;
  const pub = pubRes.data;
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
