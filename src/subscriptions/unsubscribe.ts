import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { getReaderMembership } from "src/membership.server";
import { deleteAtprotoSubscriptionForDid } from "src/subscriptions/atproto";
import { disableEmailRows } from "src/subscriptions/email";

export type FullUnsubscribeError =
  // An active, not-yet-canceled paid membership blocks full unsubscribe: the
  // reader must cancel (downgrade to the free tier) first, so we never delete
  // the subscription records out from under a live paid entitlement.
  | "membership_active"
  // The membership is already set to cancel at period end; fully unsubscribing
  // now cancels the Stripe subscription immediately and forfeits the remaining
  // paid time, so it needs the caller to pass an explicit confirmation.
  | "membership_pending_cancellation"
  | "not_subscribed"
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
// and atproto halves.
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
  }

  // Cancel whatever Stripe subscription is attached: the confirmed
  // pending-cancellation case above, and also dead leftovers (incomplete, or a
  // status Stripe has already retired) that would otherwise keep retrying
  // charges against a reader who has fully walked away. Best-effort for the
  // leftovers; a live pending-cancellation sub must verifiably cancel before
  // we proceed.
  if (
    args.allowStripeCancel &&
    membership?.stripe_subscription_id &&
    membership.stripe_account_id
  ) {
    const stripe = getStripe();
    const stripeAccount = membership.stripe_account_id;
    try {
      await stripe.subscriptions.cancel(membership.stripe_subscription_id, {
        stripeAccount,
      });
    } catch (e) {
      const sub = await stripe.subscriptions
        .retrieve(membership.stripe_subscription_id, { stripeAccount })
        .catch((err) =>
          (err as { code?: string })?.code === "resource_missing"
            ? null
            : undefined,
        );
      const gone =
        sub === null ||
        sub?.status === "canceled" ||
        sub?.status === "incomplete_expired";
      if (!gone && isLiveMembership(membership)) {
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

  const { data: identityRows, error: readError } = args.identity
    ? await supabaseServerClient
        .from("publication_email_subscribers")
        .select("id, state")
        .eq("publication", args.publication)
        .eq("identity_id", args.identity.id)
    : { data: null, error: null };
  if (readError) {
    console.error("[fullUnsubscribe] subscriber read failed:", readError);
    return Err("database_error");
  }
  const rowsById = new Map(
    [...(identityRows ?? []), ...(args.subscriberRows ?? [])].map((r) => [
      r.id,
      r,
    ]),
  );
  const allRows = [...rowsById.values()];
  const activeRows = allRows.filter((r) => r.state !== "unsubscribed");

  const hasAtprotoSub = args.identity?.atp_did
    ? !!(
        await supabaseServerClient
          .from("publication_subscriptions")
          .select("uri")
          .eq("identity", args.identity.atp_did)
          .eq("publication", args.publication)
          .maybeSingle()
      ).data
    : false;

  if (activeRows.length === 0 && !hasAtprotoSub && !membership) {
    // Idempotent when there was ever a subscription; an error otherwise.
    if (allRows.length > 0) return Ok(null);
    return Err("not_subscribed");
  }

  const disabled = await disableEmailRows(
    args.publication,
    activeRows.map((r) => r.id),
    args.identity ?? {},
  );
  if (!disabled.ok) return disabled;

  if (args.identity?.atp_did && hasAtprotoSub)
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
