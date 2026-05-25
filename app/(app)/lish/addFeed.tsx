"use server";

import { AppBskyActorDefs, Agent as BskyAgent } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
const leafletFeedURI =
  "at://did:plc:btxrwcaeyodrap5mnjw2fvmz/app.bsky.feed.generator/subscribedPublications";

export async function addFeed(): Promise<
  { success: true } | { success: false; error: OAuthSessionError }
> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let bsky = new BskyAgent(credentialSession);
  let prefs = await bsky.app.bsky.actor.getPreferences();
  let savedFeeds = prefs.data.preferences.find(
    (pref) => pref.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
  ) as AppBskyActorDefs.SavedFeedsPrefV2;

  let hasFeed = !!savedFeeds.items.find(
    (feed) => feed.value === leafletFeedURI,
  );
  if (hasFeed) return { success: true };

  await bsky.addSavedFeeds([
    {
      value: leafletFeedURI,
      pinned: true,
      type: "feed",
    },
  ]);
  return { success: true };
}
