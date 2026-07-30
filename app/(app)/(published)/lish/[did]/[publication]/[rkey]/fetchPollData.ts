"use server";

import { Json } from "supabase/database.types";
import { supabaseServerClient } from "supabase/serverClient";

export type PollData = {
  uri: string;
  cid: string;
  record: Json;
  atp_poll_votes: { record: Json; voter_did: string }[];
};

export async function fetchPollData(pollUris: string[]): Promise<PollData[]> {
  const { data } = await supabaseServerClient
    .from("atp_poll_records")
    .select(`*, atp_poll_votes(*)`)
    .in("uri", pollUris);

  return data || [];
}
