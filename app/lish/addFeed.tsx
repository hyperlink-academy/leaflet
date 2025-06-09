"use server";

import { AppBskyActorDefs, Agent as BskyAgent } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import { createOauthClient } from "src/atproto-oauth";
const leafletFeedURI =
  "at://did:plc:btxrwcaeyodrap5mnjw2fvmz/app.bsky.feed.generator/subscribedPublications";

export async function addFeed() {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    throw new Error("Invalid identity data");
  }

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let bsky = new BskyAgent(credentialSession);
  await bsky.addSavedFeeds([
    {
      value: leafletFeedURI,
      pinned: true,
      type: "feed",
    },
  ]);
}
