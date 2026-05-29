import { callRPC } from "app/api/rpc/client";
import useSWR from "swr";

// Basic profile (avatar/handle/displayName) for a DID, from the cached
// get_profiles route. Callers only need those fields, so this avoids the
// heavier get_profile_data (handle resolution + OAuth agent + publications).
export function useRecordFromDid(did: string | undefined | null) {
  return useSWR(did ? ["basic-profile", did] : null, async () => {
    const response = await callRPC("get_profiles", { dids: [did!] });
    return response.result.profiles[did!] ?? undefined;
  });
}
