// Managing a subscription (tier changes, cancellation, the email toggle)
// requires a real session, which a reader following a link from their inbox
// doesn't have: bounce through email-login, which reuses a matching session or
// emails a code, then land on the publication with the manage panel
// auto-opened. Publications without a resolvable URL fall back to the
// account-wide subscriptions page.
export function manageSubscriptionUrl(args: {
  baseUrl: string;
  email: string;
  publicationUrl: string | null | undefined;
}): string {
  const target = args.publicationUrl
    ? `${args.publicationUrl.replace(/\/$/, "")}?manage_subscription=1`
    : `${args.baseUrl}/subscriptions`;
  return `${args.baseUrl}/api/auth/email-login?${new URLSearchParams({
    email: args.email,
    redirect: target,
  }).toString()}`;
}
