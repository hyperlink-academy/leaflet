import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { getReaderMembership } from "src/membership.server";
import { deleteAtprotoSubscriptionForDid } from "src/subscriptions/atproto";
import { disableEmailSubscription } from "src/subscriptions/email";

export type FullUnsubscribeError =
  // An active, not-yet-canceled paid membership blocks full unsubscribe: the
  // reader must cancel (downgrade to the free tier) first, so we never delete
  // the subscription records out from under a live paid entitlement.
  | "membership_active"
  // The membership is already set to cancel at period end; fully unsubscribing
  // now cancels the Stripe subscription immediately and forfeits the remaining
  // paid time, so it needs the caller to pass an explicit confirmation.
  | "membership_pending_cancellation"
  | "stripe_error"
  | "database_error";

// A membership Stripe can still bill against. Deliberately broader than
// isActiveMembership, which reads a membership as inactive the moment
// current_period_end passes: between period end and the renewal webhook, and
// throughout a past_due retry, the Stripe subscription is still live, so
// cancelling it needs the same confirmation an unambiguously active one does.
function isLiveMembership(m: { status: string | null }): boolean {
  return (
    m.status === "active" || m.status === "trialing" || m.status === "past_due"
  );
}

// The one full-unsubscribe path: clears the email rows, the atproto record
// (PDS + row, best-effort on the PDS half), and — for callers that hold both
// billing flags — an already-canceling Stripe subscription. Used by the
// authenticated unsubscribe action and the token-link route; `identity` is
// null for orphaned token rows (no identity_id), which skips the membership
// and atproto halves. Idempotent: unsubscribing twice is a no-op, not an error.
export async function fullUnsubscribe(args: {
  publication: string;
  identity: { id: string; atp_did: string | null; email: string | null } | null;
  // Extra rows resolved outside the identity (the token row itself); merged
  // with the identity's own rows.
  subscriberRows?: { id: string; state: string }[];
  cancelPaidImmediately?: boolean;
  // Only an authenticated caller may set this. Unsubscribe links are followed
  // by mail-client and link-scanner prefetches and by Postmark's one-click
  // List-Unsubscribe-Post, none of which represent a human deciding to end a
  // paid membership, so the token route leaves Stripe untouched entirely.
  allowStripeCancel?: boolean;
}): Promise<Result<null, FullUnsubscribeError>> {
  const membership = args.identity
    ? await getReaderMembership(args.publication, args.identity.id)
    : null;

  if (membership && isLiveMembership(membership)) {
    if (!membership.cancel_at_period_end) return Err("membership_active");
    if (!args.cancelPaidImmediately || !args.allowStripeCancel)
      return Err("membership_pending_cancellation");

    // End the billing before dropping the records, so a Stripe failure leaves
    // the reader subscribed rather than paying for a publication they no
    // longer follow.
    if (membership.stripe_subscription_id && membership.stripe_account_id) {
      try {
        await getStripe().subscriptions.cancel(
          membership.stripe_subscription_id,
          { stripeAccount: membership.stripe_account_id },
        );
      } catch (e) {
        // A subscription Stripe has already dropped is the outcome we wanted.
        if ((e as { code?: string })?.code !== "resource_missing") {
          console.error(
            `[fullUnsubscribe] failed to cancel subscription ${membership.stripe_subscription_id}:`,
            e,
          );
          return Err("stripe_error");
        }
      }
      const { error } = await supabaseServerClient
        .from("publication_memberships")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", membership.id);
      if (error)
        // The webhook's subscription.deleted event will reconcile the row.
        console.error("[fullUnsubscribe] membership row update failed:", error);
    }
  }

  const disabled = await disableEmailSubscription(
    args.publication,
    args.identity,
    args.subscriberRows,
  );
  if (!disabled.ok) return disabled;

  // Idempotent and best-effort; no need to check for a record first.
  if (args.identity?.atp_did)
    await deleteAtprotoSubscriptionForDid(
      args.identity.atp_did,
      args.publication,
    );

  // NOTE: Postmark Suppressions API is deliberately NOT called here. Per spec,
  // in-app unsubscribes only flip local state — this prevents a Pub A
  // unsubscribe from silently breaking Pub B deliveries on the shared broadcast
  // stream. Phase 7 handles webhook-driven suppression reconciliation.

  return Ok(null);
}
