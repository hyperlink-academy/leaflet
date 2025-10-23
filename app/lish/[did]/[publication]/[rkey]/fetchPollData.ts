"use server";

import { getIdentityData } from "actions/getIdentityData";
import { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";

export type PollData = {
  uri: string;
  cid: string;
  record: Json;
  atp_poll_votes: { option: string; voter_did: string }[];
};

export async function fetchPollData(pollUris: string[]): Promise<PollData[]> {
  // Get current user's identity to check if they've voted
  const identity = await getIdentityData();
  const userDid = identity?.atp_did;

  const { data } = await supabaseServerClient
    .from("atp_poll_records")
    .select(`*, atp_poll_votes(*)`)
    .in("uri", pollUris);

  return data || [];
}
