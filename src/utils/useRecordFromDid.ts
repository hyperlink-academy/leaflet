import { callRPC } from "app/api/rpc/client";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import useSWR from "swr";

export function useRecordFromDid(did: string | undefined | null) {
  return useSWR(did ? ["profile-data", did] : null, async () => {
    const response = await callRPC("get_profile_data", {
      didOrHandle: did!,
    });
    return response.result.profile as ProfileViewDetailed | undefined;
  });
}
