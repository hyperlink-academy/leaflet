"use client";
import type { Cadence } from "components/Memberships/TierGrid";

// A join left the page (Stripe card setup, OAuth or main-site email sign-in)
// and came back with markers in the URL; the resuming surface reads them and
// hands them to the join flow so it picks up where it left off.
export type JoinResume =
  | {
      kind: "wallet";
      sessionId: string;
      tierId: string | null;
      cadence: Cadence | null;
    }
  | { kind: "auth"; tierId: string; cadence: Cadence | null };

// The join flow leaves the page for Stripe's hosted card setup
// (?wallet_session=…) or an auth redirect (?join_tier=…) and resumes on
// return. Several surfaces listen for those markers — the paywall's inline
// flow and PaidSubscribeButton in the nav/header — and one page can mount more
// than one of them. The first to claim the return completes the join; the rest
// stand down so it doesn't run twice.
let claimed = false;

export function claimJoinReturn(): boolean {
  if (claimed) return false;
  claimed = true;
  return true;
}

// Reads (and claims) a join return from the current URL, stripping the markers
// so a refresh doesn't reprocess them. Returns null when there's nothing to
// resume or another surface already claimed it.
export function readJoinResume(): JoinResume | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("wallet_session");
  const tierId = params.get("join_tier");
  const cad = params.get("join_cadence");
  const cadence = cad === "year" ? "year" : cad === "month" ? "month" : null;
  if (!sessionId && !tierId) return null;
  if (!claimJoinReturn()) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return sessionId
    ? { kind: "wallet", sessionId, tierId, cadence }
    : { kind: "auth", tierId: tierId!, cadence };
}
