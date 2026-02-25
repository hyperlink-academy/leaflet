import { useIdentityData } from "components/IdentityProvider";

export function useHasEntitlement(key: string): boolean {
  const { identity } = useIdentityData();
  if (!identity?.entitlements) return false;
  return key in identity.entitlements;
}

export function useIsPro(): boolean {
  return useHasEntitlement("publication_analytics");
}
