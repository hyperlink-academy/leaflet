// Pure entitlement logic shared between the client `useEntitlement` hooks and
// server actions. Keeping the "is this user Pro?" check in one place means the
// client gating and the server enforcement can never drift apart.

// The single entitlement key that grants Leaflet Pro.
const PRO_ENTITLEMENT_KEY = "publication_analytics";

// Grants access to the in-progress Stripe Connect payments UI, so the feature
// can be rolled out to specific users while it's still being built.
const PAYMENTS_ENTITLEMENT_KEY = "payments";

// Keys the app currently checks, surfaced as suggestions in the admin UI.
// Grants are not restricted to this list.
export const KNOWN_ENTITLEMENT_KEYS = [
  PRO_ENTITLEMENT_KEY,
  PAYMENTS_ENTITLEMENT_KEY,
  "pro_plan_visible",
];

export function hasEntitlement(
  entitlements: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  if (!entitlements) return false;
  return key in entitlements;
}

export function isPro(
  entitlements: Record<string, unknown> | null | undefined,
): boolean {
  return hasEntitlement(entitlements, PRO_ENTITLEMENT_KEY);
}

export function canSeePayments(
  entitlements: Record<string, unknown> | null | undefined,
): boolean {
  return hasEntitlement(entitlements, PAYMENTS_ENTITLEMENT_KEY);
}
