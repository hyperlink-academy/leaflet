import { useIdentityData } from "components/IdentityProvider";
import { canSeePayments, hasEntitlement, isPro } from "src/entitlements";

export function useHasEntitlement(key: string): boolean {
  const { identity } = useIdentityData();
  return hasEntitlement(identity?.entitlements, key);
}

export function useIsPro(): boolean {
  const { identity } = useIdentityData();
  return isPro(identity?.entitlements);
}

export function useCanSeePro(): boolean {
  return true;
}

// Gates the in-progress Stripe Connect payments UI behind a per-user
// entitlement, so it can be enabled for specific publishers before launch.
export function useCanSeePayments(): boolean {
  const { identity } = useIdentityData();
  return canSeePayments(identity?.entitlements);
}
