import { isActiveMembership } from "src/membership";

// The one viewer-facing shape for "how am I subscribed to this publication",
// derived from the three underlying tables (atproto subscription row, email
// subscriber rows, membership row). Client-safe: used by useViewerSubscription
// off the identity payload's SUBSCRIPTION_STATE_EMBEDS, and server-side where
// the same rows are in hand.
export type SubscriptionState = {
  // Any form of subscription, including an active membership. The atproto
  // record is the root for linked accounts, but an email-only identity's email
  // row (or membership) counts on its own.
  subscribed: boolean;
  atprotoSubscribed: boolean;
  // A confirmed email row = email delivery on. Muting email flips the row to
  // `unsubscribed`; there is no separate "muted" state.
  emailEnabled: boolean;
  membership: {
    tier: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

export function deriveSubscriptionState(
  publicationUri: string,
  rows: {
    subscriptions?: { publication: string }[] | null;
    emailSubscribers?: { publication: string; state: string }[] | null;
    memberships?:
      | {
          publication: string;
          tier: string | null;
          status: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
        }[]
      | null;
  },
): SubscriptionState {
  const atprotoSubscribed = (rows.subscriptions ?? []).some(
    (s) => s.publication === publicationUri,
  );
  const emailEnabled = (rows.emailSubscribers ?? []).some(
    (s) => s.publication === publicationUri && s.state === "confirmed",
  );
  const membershipRow =
    (rows.memberships ?? []).find(
      (m) => m.publication === publicationUri && isActiveMembership(m),
    ) ?? null;
  const membership = membershipRow
    ? {
        tier: membershipRow.tier,
        status: membershipRow.status,
        currentPeriodEnd: membershipRow.current_period_end,
        cancelAtPeriodEnd: membershipRow.cancel_at_period_end,
      }
    : null;
  return {
    subscribed: atprotoSubscribed || emailEnabled || !!membership,
    atprotoSubscribed,
    emailEnabled,
    membership,
  };
}
