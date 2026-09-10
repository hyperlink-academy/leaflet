"use server";

import { getAuthIdentity } from "src/auth";
import { OAuthSessionError } from "src/atproto-oauth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  sanitizeSubscriptionSource,
  type SubscriptionSource,
} from "src/subscriptionSource";
import { buildOauthLoginUrl } from "src/utils/customDomain";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { createAtprotoSubscription } from "src/subscriptions/atproto";
import {
  subscriptionSourceProperties,
  trackUserEvent,
} from "src/activeUserAnalytics";

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

  const created = await createAtprotoSubscription(
    identity.atp_did,
    publication,
  );
  if (!created.ok) return { success: false, error: created.error };
  // Null when a subscription already existed, which isn't a new subscribe.
  if (created.value)
    trackUserEvent(identity, "subscribe", {
      publication,
      method: "atproto",
      record_uri: created.value.uri,
      ...subscriptionSourceProperties(subscribeSource),
    });

  return { success: true };
}
