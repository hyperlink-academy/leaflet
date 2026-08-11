// User-facing status of a Stripe Connect account, derived from the flags and
// `requirements` object that syncConnectedAccountState persists. Pure module
// (no Stripe/DB clients) so identity payload code can import it too.
export type ConnectedAccountStatus =
  | "onboarding_incomplete"
  | "under_review"
  | "rejected"
  | "active";

type Requirements = {
  currently_due?: string[] | null;
  past_due?: string[] | null;
  pending_verification?: string[] | null;
  disabled_reason?: string | null;
};

export function deriveConnectedAccountStatus(account: {
  charges_enabled: boolean | null;
  requirements: unknown;
}): ConnectedAccountStatus {
  if (account.charges_enabled) return "active";
  const req = (account.requirements ?? {}) as Requirements;
  const disabledReason = req.disabled_reason ?? "";
  // Covers "rejected.fraud", "rejected.terms_of_service", "rejected.listed", etc.
  if (disabledReason.startsWith("rejected")) return "rejected";
  // Outstanding user-provided info wins over a concurrent review: both lists
  // can be non-empty at once, and resolving currently_due/past_due is what
  // unblocks the account, so send the user back through onboarding.
  if (req.currently_due?.length || req.past_due?.length)
    return "onboarding_incomplete";
  if (
    req.pending_verification?.length ||
    disabledReason === "under_review" ||
    disabledReason === "requirements.pending_verification"
  )
    return "under_review";
  // Requirements not yet synced, or a disabled_reason we don't recognize:
  // offering the onboarding link is the safe default. `details_submitted`
  // alone is NOT a review signal — Stripe can push new currently_due items
  // after submission, which must route back to onboarding.
  return "onboarding_incomplete";
}
