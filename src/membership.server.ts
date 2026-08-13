import { AtUri } from "@atproto/syntax";
import { v7 } from "uuid";
import { getStripe } from "stripe/client";
import { supabaseServerClient } from "supabase/serverClient";
import {
  type Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";

// Server-side companions to src/membership.ts (which stays client-safe).
// notifyNewMember lives here rather than in src/notifications.ts because that
// module is "use server" — exporting it there would make it a wire-callable
// action anyone could invoke with arbitrary publication/membership ids.

// Notify the publication owner of a new member. Both the inline join flow and
// the webhook (transition + reconciliation paths) can observe the same
// activation, so dedupe on the membership id before inserting.
export async function notifyNewMember(
  publication: string | undefined,
  membershipId: string,
) {
  if (!publication) return;
  const recipient = new AtUri(publication).host;

  const { data: existing, error: readError } = await supabaseServerClient
    .from("notifications")
    .select("id")
    .eq("data->>type", "new_member")
    .eq("data->>membership_id", membershipId)
    .limit(1);
  if (readError) throw readError;
  if (existing && existing.length > 0) return;

  const notification: Notification = {
    id: v7(),
    recipient,
    data: { type: "new_member", publication, membership_id: membershipId },
  };
  const { error } = await supabaseServerClient
    .from("notifications")
    .insert(notification);
  if (error) throw error;
  await pingIdentityToUpdateNotification(recipient);
}

// Cancel every member's Stripe subscription for a publication, immediately.
// Deleting a publication cascades the membership rows away, so any
// subscription left live at that point keeps billing the reader with no
// record, no access, and no in-app way to cancel. Returns false if any
// subscription could not be confirmed canceled — callers must abort the
// teardown in that case rather than orphan a live subscription.
export async function cancelPublicationMemberSubscriptions(
  publicationUri: string,
): Promise<boolean> {
  const { data: memberships, error } = await supabaseServerClient
    .from("publication_memberships")
    .select("id, stripe_subscription_id, stripe_account_id")
    .eq("publication", publicationUri)
    .not("stripe_subscription_id", "is", null);
  if (error) {
    console.error("[membership] membership read for teardown failed:", error);
    return false;
  }

  const stripe = getStripe();
  let ok = true;
  for (const m of memberships ?? []) {
    if (!m.stripe_subscription_id) continue;
    const stripeAccount = m.stripe_account_id;
    if (!stripeAccount) {
      console.error(
        `[membership] membership ${m.id} has no connected account; cannot cancel subscription ${m.stripe_subscription_id}`,
      );
      ok = false;
      continue;
    }
    try {
      await stripe.subscriptions.cancel(m.stripe_subscription_id, {
        stripeAccount,
      });
    } catch (e) {
      // Canceling an already-canceled (or deleted) subscription throws, but
      // that's the state we want — only fail if it's verifiably still live
      // or we can't tell.
      const sub = await stripe.subscriptions
        .retrieve(m.stripe_subscription_id, { stripeAccount })
        .catch((err) =>
          (err as { code?: string })?.code === "resource_missing"
            ? null
            : undefined,
        );
      const gone =
        sub === null ||
        sub?.status === "canceled" ||
        sub?.status === "incomplete_expired";
      if (!gone) {
        console.error(
          `[membership] failed to cancel subscription ${m.stripe_subscription_id} on ${stripeAccount}:`,
          e,
        );
        ok = false;
      }
    }
  }
  return ok;
}

export async function isPublicationSubscriber(
  publicationUri: string,
  identity: { id: string; atp_did: string | null },
): Promise<boolean> {
  const [atproto, email] = await Promise.all([
    identity.atp_did
      ? supabaseServerClient
          .from("publication_subscriptions")
          .select("uri")
          .eq("publication", publicationUri)
          .eq("identity", identity.atp_did)
          .limit(1)
      : null,
    supabaseServerClient
      .from("publication_email_subscribers")
      .select("id")
      .eq("publication", publicationUri)
      .eq("identity_id", identity.id)
      .eq("state", "confirmed")
      .limit(1),
  ]);
  return !!atproto?.data?.length || !!email.data?.length;
}

export async function getReaderMembership(
  publicationUri: string,
  identityId: string,
) {
  const { data } = await supabaseServerClient
    .from("publication_memberships")
    .select(
      "id, tier, status, current_period_end, stripe_customer_id, stripe_subscription_id, stripe_account_id, cadence",
    )
    .eq("publication", publicationUri)
    .eq("identity_id", identityId)
    .maybeSingle();
  return data;
}
