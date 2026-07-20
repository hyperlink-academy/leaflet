import { cacheTag } from "next/cache";
import { pollTag } from "src/cacheTags";
import { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";

export type PollData = {
  uri: string;
  cid: string;
  record: Json;
  atp_poll_votes: { record: Json; voter_did: string }[];
};

// Viewer-independent: which vote (if any) belongs to the viewer is derived
// client-side from the identity context.
export async function fetchPollData(pollUris: string[]): Promise<PollData[]> {
  for (const uri of pollUris) cacheTag(pollTag(uri));

  const { data } = await supabaseServerClient
    .from("atp_poll_records")
    .select(`*, atp_poll_votes(*)`)
    .in("uri", pollUris);

  return data || [];
}
