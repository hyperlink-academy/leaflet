"use server";

import { AppBskyActorDefs, Agent as BskyAgent } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import { createOauthClient } from "src/atproto-oauth";
const leafletFeedURI =
  "at://did:plc:btxrwcaeyodrap5mnjw2fvmz/app.bsky.feed.generator/subscribedPublications";

export async function fixFeeds() {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    throw new Error("Invalid identity data");
  }

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let bsky = new BskyAgent(credentialSession);
  let prefs = await bsky.app.bsky.actor.getPreferences();
  let savedFeeds = prefs.data.preferences.find(
    (pref) => pref.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
  ) as AppBskyActorDefs.SavedFeedsPrefV2;

  let pubFeeds = savedFeeds.items.filter(
    (feed) => feed.value === leafletFeedURI,
  );
  await bsky.removeSavedFeeds(pubFeeds.map((f) => f.id));

  await bsky.addSavedFeeds([
    {
      value: leafletFeedURI,
      pinned: true,
      type: "feed",
    },
  ]);
}
