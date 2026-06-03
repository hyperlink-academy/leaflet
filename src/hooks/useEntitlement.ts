import { useIdentityData } from "components/IdentityProvider";
import { hasEntitlement, isPro } from "src/entitlements";

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
