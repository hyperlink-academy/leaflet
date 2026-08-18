import {
  isActiveMembership,
  type MembershipStatusFields,
} from "src/membership";

// The one viewer-facing shape for "how am I subscribed to this publication",
// derived from the three underlying tables (atproto subscription row, email
// subscriber rows, membership row). Client-safe: used by useViewerSubscription
// off the identity payload's SUBSCRIPTION_STATE_EMBEDS.
export type SubscriptionState = {
  // Any form of subscription, including an active membership. The atproto
  // record is the root for linked accounts, but an email-only identity's email
  // row (or membership) counts on its own.
  subscribed: boolean;
  atprotoSubscribed: boolean;
  // A confirmed email row = email delivery on. Muting email flips the row to
  // `unsubscribed`; there is no separate "muted" state.
  emailEnabled: boolean;
};

export function deriveSubscriptionState(
  publicationUri: string,
  rows: {
    subscriptions?: { publication: string }[] | null;
    emailSubscribers?: { publication: string; state: string }[] | null;
    memberships?: ({ publication: string } & MembershipStatusFields)[] | null;
  },
): SubscriptionState {
  const atprotoSubscribed = (rows.subscriptions ?? []).some(
    (s) => s.publication === publicationUri,
  );
  const emailEnabled = (rows.emailSubscribers ?? []).some(
    (s) => s.publication === publicationUri && s.state === "confirmed",
  );
  const isMember = (rows.memberships ?? []).some(
    (m) => m.publication === publicationUri && isActiveMembership(m),
  );
  return {
    subscribed: atprotoSubscribed || emailEnabled || isMember,
    atprotoSubscribed,
    emailEnabled,
  };
}
