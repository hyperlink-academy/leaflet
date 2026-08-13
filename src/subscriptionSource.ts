// Where a subscribe action was initiated from, threaded from the UI through
// the subscribe server actions into analytics (see src/subscriptionAnalytics).
// Client-safe: imported by components and by afterSignInActions to carry the
// source across auth redirects.

export const SUBSCRIPTION_PLACEMENTS = [
  "pub_header",
  "pub_nav",
  "post_footer",
  "signup_block",
  "subscribe_page",
  "paywall",
  "join_page",
  "profile",
  "recommendation",
  "editor",
  "embed",
] as const;

export type SubscriptionPlacement = (typeof SUBSCRIPTION_PLACEMENTS)[number];

export type SubscriptionSource = {
  placement: SubscriptionPlacement;
  // The publication whose recommendations surfaced this subscribe
  // (placement: "recommendation").
  publication?: string;
  // Page URL the subscribe originated on. Set explicitly when the flow passes
  // through a redirect (OAuth/email login) where the Referer is lost.
  url?: string;
};

// Subscribe sources arrive from the client (component props, redirect action
// params, embed form fields), so clamp them before they reach analytics:
// unknown placements are dropped and free-text fields are length-limited.
export function sanitizeSubscriptionSource(
  source: unknown,
): SubscriptionSource | null {
  if (!source || typeof source !== "object") return null;
  const s = source as Record<string, unknown>;
  if (
    typeof s.placement !== "string" ||
    !(SUBSCRIPTION_PLACEMENTS as readonly string[]).includes(s.placement)
  )
    return null;
  const result: SubscriptionSource = {
    placement: s.placement as SubscriptionPlacement,
  };
  if (typeof s.publication === "string" && s.publication.length <= 512)
    result.publication = s.publication;
  if (typeof s.url === "string" && s.url.length <= 2048) result.url = s.url;
  return result;
}
