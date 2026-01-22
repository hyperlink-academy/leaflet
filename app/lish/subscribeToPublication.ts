"use server";

import { AtpBaseClient } from "lexicons/api";
import { AppBskyActorDefs, Agent as BskyAgent } from "@atproto/api";
import { getIdentityData } from "actions/getIdentityData";
import {
  restoreOAuthSession,
  OAuthSessionError,
} from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { revalidatePath } from "next/cache";
import { AtUri } from "@atproto/syntax";
import { redirect } from "next/navigation";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { Json } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { v7 } from "uuid";

let leafletFeedURI =
  "at://did:plc:btxrwcaeyodrap5mnjw2fvmz/app.bsky.feed.generator/subscribedPublications";
let idResolver = new IdResolver();

type SubscribeResult =
  | { success: true; hasFeed: boolean }
  | { success: false; error: OAuthSessionError };

export async function subscribeToPublication(
  publication: string,
  redirectRoute?: string,
): Promise<SubscribeResult | never> {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return redirect(
      `/api/oauth/login?redirect_url=${redirectRoute}&action=${encodeActionToSearchParam({ action: "subscribe", publication })}`,
    );
  }

  const sessionResult = await restoreOAuthSession(identity.atp_did);
  if (!sessionResult.ok) {
    return { success: false, error: sessionResult.error };
  }
  let credentialSession = sessionResult.value;
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let record = await agent.site.standard.graph.subscription.create(
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

  // Create notification for the publication owner
  let publicationOwner = new AtUri(publication).host;
  if (publicationOwner !== credentialSession.did) {
    let notification: Notification = {
      id: v7(),
      recipient: publicationOwner,
      data: {
        type: "subscribe",
        subscription_uri: record.uri,
      },
    };
    await supabaseServerClient.from("notifications").insert(notification);
    await pingIdentityToUpdateNotification(publicationOwner);
  }

  let bsky = new BskyAgent(credentialSession);
  let [prefs, profile, resolveDid] = await Promise.all([
    bsky.app.bsky.actor.getPreferences(),
    bsky.app.bsky.actor.profile
      .get({
        repo: credentialSession.did!,
        rkey: "self",
      })
      .catch(),
    idResolver.did.resolve(credentialSession.did!),
  ]);
  if (!identity.bsky_profiles && profile.value) {
    await supabaseServerClient.from("bsky_profiles").insert({
      did: identity.atp_did,
      record: profile.value as Json,
      handle: resolveDid?.alsoKnownAs?.[0]?.slice(5),
    });
  }
  let savedFeeds = prefs.data.preferences.find(
    (pref) => pref.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
  ) as AppBskyActorDefs.SavedFeedsPrefV2;
  revalidatePath("/lish/[did]/[publication]", "layout");
  return {
    success: true,
    hasFeed: !!savedFeeds.items.find((feed) => feed.value === leafletFeedURI),
  };
}

type UnsubscribeResult =
  | { success: true }
  | { success: false; error: OAuthSessionError };

export async function unsubscribeToPublication(
  publication: string
): Promise<UnsubscribeResult> {
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
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: existingSubscription } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("*")
    .eq("identity", identity.atp_did)
    .eq("publication", publication)
    .single();
  if (!existingSubscription) return { success: true };

  // Delete from both collections (old and new schema) - one or both may exist
  let rkey = new AtUri(existingSubscription.uri).rkey;
  await Promise.all([
    agent.pub.leaflet.graph.subscription.delete({ repo: credentialSession.did!, rkey }).catch(() => {}),
    agent.site.standard.graph.subscription.delete({ repo: credentialSession.did!, rkey }).catch(() => {}),
  ]);

  await supabaseServerClient
    .from("publication_subscriptions")
    .delete()
    .eq("identity", identity.atp_did)
    .eq("publication", publication);
  revalidatePath("/lish/[did]/[publication]", "layout");
  return { success: true };
}
