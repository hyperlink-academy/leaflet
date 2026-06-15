import useSWR from "swr";
import { callRPC } from "app/api/rpc/client";

// Fetches basic profiles (handle/displayName/avatar) for a set of contributor
// DIDs via the get_profiles RPC. Keyed on the sorted DID set so the cache is
// shared across components and refetches when the set changes. `data` is a
// record of did -> profile (empty object until loaded).
export function useContributorProfiles(dids: string[]) {
  return useSWR(
    dids.length ? `contributor-profiles-${[...dids].sort().join(",")}` : null,
    async () => {
      let res = await callRPC("get_profiles", { dids });
      return res?.result?.profiles ?? {};
    },
  );
}
