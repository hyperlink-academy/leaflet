"use server";

import { AtpBaseClient } from "lexicons/api";
import { getAuthIdentity } from "src/auth";
import { restoreOAuthSession, OAuthSessionError } from "src/atproto-oauth";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { trackSubscriptionEvent } from "src/subscriptionAnalytics";
import {
  sanitizeSubscriptionSource,
  type SubscriptionSource,
} from "src/subscriptionSource";
import { buildOauthLoginUrl } from "src/utils/customDomain";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import {
  Notification,
  pingIdentityToUpdateNotification,
} from "src/notifications";
import { v7 } from "uuid";

type SubscribeResult =
  | { success: true }
  | { success: false; error: OAuthSessionError };

export async function subscribeToPublication(
  publication: string,
  redirectRoute?: string,
  source?: SubscriptionSource,
): Promise<SubscribeResult | never> {
  let requestHeaders = await headers();
  let subscribeSource = sanitizeSubscriptionSource(source);
  if (subscribeSource && !subscribeSource.url) {
    let referer = requestHeaders.get("referer");
    if (referer) subscribeSource = { ...subscribeSource, url: referer };
  }
  let identity = await getAuthIdentity();
  if (!identity || !identity.atp_did) {
    return redirect(
      buildOauthLoginUrl(
        {
          redirect: redirectRoute || "/",
          action: encodeActionToSearchParam({
            action: "subscribe",
            publication,
            ...(subscribeSource ? { source: subscribeSource } : {}),
          }),
        },
        requestHeaders.get("host") ?? undefined,
      ),
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

  let { data: existingSubscription } = await supabaseServerClient
    .from("publication_subscriptions")
    .select("uri")
    .eq("identity", credentialSession.did!)
    .eq("publication", publication)
    .maybeSingle();
  if (existingSubscription) {
    return { success: true };
  }

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

  after(() =>
    trackSubscriptionEvent({
      event: "subscribe",
      method: "atproto",
      origin: "app",
      publicationUri: publication,
      subscriberDid: credentialSession.did,
      recordUri: record.uri,
      source: subscribeSource,
    }),
  );

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

  return {
    success: true,
  };
}
