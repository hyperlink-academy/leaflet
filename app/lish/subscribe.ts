"use server";

import { AtpBaseClient } from "lexicons/api";
import { AppBskyActorDefs, Agent as BskyAgent } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import { createOauthClient } from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/syntax";

let leafletFeedURI =
  "at://did:plc:jjsc5rflv3cpv6hgtqhn2dcm/app.bsky.feed.generator/subscriptions";
export async function subscribeToPublication(publication: string) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let record = await agent.pub.leaflet.graph.subscription.create(
    { repo: credentialSession.did!, rkey: TID.nextStr() },
    {
      publication,
    },
  );
  let { error } = await supabaseServerClient
    .from("publication_subscriptions")
    .insert({
      uri: record.uri,
      record,
      publication,
      identity: credentialSession.did!,
    });
  let bsky = new BskyAgent(credentialSession);
  let prefs = await bsky.app.bsky.actor.getPreferences();
  let savedFeeds = prefs.data.preferences.find(
    (pref) => pref.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
  ) as AppBskyActorDefs.SavedFeedsPrefV2;
  revalidatePath("/lish/[did]/[publication]", "layout");
  return savedFeeds.items.find((feed) => feed.value === leafletFeedURI);
}

export async function unsubscribeToPublication(publication: string) {
  console.log("calling unsubscribe!");
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: existingSubscription } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("*")
    .eq("identity", identity.atp_did)
    .eq("publication", publication)
    .single();
  if (!existingSubscription) return;
  await agent.pub.leaflet.graph.subscription.delete({
    repo: credentialSession.did!,
    rkey: new AtUri(existingSubscription.uri).rkey,
  });
  await supabaseServerClient
    .from("publication_subscriptions")
    .delete()
    .eq("identity", identity.atp_did)
    .eq("publication", publication);
  revalidatePath("/lish/[did]/[publication]", "layout");
}
