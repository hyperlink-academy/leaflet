"use server";

import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient, AtUri } from "@atproto/api";
import { PubLeafletPollVote } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { TID } from "@atproto/common";

export async function voteOnPublishedPoll(
  pollUri: string,
  pollCid: string,
  selectedOption: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const identity = await getIdentityData();

    if (!identity?.atp_did) {
      return { success: false, error: "Not authenticated" };
    }

    const oauthClient = await createOauthClient();
    const session = await oauthClient.restore(identity.atp_did);
    let agent = new AtpBaseClient(session.fetchHandler.bind(session));

    const voteRecord: PubLeafletPollVote.Record = {
      $type: "pub.leaflet.poll.vote",
      poll: {
        uri: pollUri,
        cid: pollCid,
      },
      option: selectedOption,
    };

    const rkey = TID.nextStr();
    const voteUri = AtUri.make(identity.atp_did, "pub.leaflet.poll.vote", rkey);

    // Write to database optimistically before creating the record
    await supabaseServerClient.from("atp_poll_votes").upsert({
      uri: voteUri.toString(),
      voter_did: identity.atp_did,
      poll_uri: pollUri,
      poll_cid: pollCid,
      option: selectedOption,
      record: voteRecord as unknown as Json,
    });

    // Create the record on ATP
    await agent.com.atproto.repo.createRecord({
      repo: identity.atp_did,
      collection: "pub.leaflet.poll.vote",
      rkey,
      record: voteRecord,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to vote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to vote",
    };
  }
}
