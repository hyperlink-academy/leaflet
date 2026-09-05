"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { after } from "next/server";
import { trackActiveUser } from "src/activeUserAnalytics";
import { getProfiles } from "src/identity";
import {
  bskyProfileFromCache,
  ENTITLEMENT_EMBEDS,
  getValidAuthToken,
  keyEntitlements,
  processConnectedAccount,
  SUBSCRIPTION_STATE_EMBEDS,
} from "src/identityPayload";
import type { getIdentityData } from "./getIdentityData";

type Identity = Awaited<ReturnType<typeof getIdentityData>>;

// The published-page counterpart to getIdentityData: everything interaction
// components need (viewer profile, subscriptions, memberships, entitlements)
// without the dashboard-only embeds. Returns the exact Identity shape with the
// omitted embeds empty so every consumer type-checks against either source;
// the `Promise<Identity>` annotation is the drift guard.
export const getViewerIdentity = cache(uncachedGetViewerIdentity);
async function uncachedGetViewerIdentity(): Promise<Identity> {
  return fetchViewerIdentity();
}

// Published pages are cached, so this mount-time fetch is the one request
// where a signed-in reader can be identified; it doubles as the "reader"
// signal for active-user stats.
export async function getViewerIdentityOnPublishedPage(): Promise<Identity> {
  let identity = await fetchViewerIdentity();
  if (identity)
    after(() =>
      trackActiveUser({ identity, role: "reader", surface: "published" }),
    );
  return identity;
}

async function fetchViewerIdentity(): Promise<Identity> {
  let auth_token = await getValidAuthToken();
  let auth_res = auth_token
    ? await supabaseServerClient
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            ${SUBSCRIPTION_STATE_EMBEDS},
            ${ENTITLEMENT_EMBEDS}
          )`,
        )
        .eq("identities.notifications.read", false)
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;

  // Spreading `identity` below must not leak these raw embeds as extra
  // top-level keys alongside the processed `entitlements` / `subscription` /
  // `connectedAccount`.
  const {
    user_entitlements: entitlementRows,
    user_subscriptions: subscription,
    stripe_connected_accounts: connectedAccount,
    ...identity
  } = auth_res.data.identities;

  const entitlements = keyEntitlements(entitlementRows);

  const profiles = identity.atp_did
    ? await getProfiles([identity.atp_did])
    : null;

  return {
    ...identity,
    fetched_at: Date.now(),
    custom_domains: [],
    permission_token_on_homepage: [],
    bsky_profiles:
      identity.atp_did && profiles
        ? bskyProfileFromCache(profiles.get(identity.atp_did) ?? null)
        : null,
    publications: [],
    contributor_publications: [],
    contributor_leaflets: [],
    entitlements,
    subscription: subscription ?? null,
    connectedAccount: processConnectedAccount(connectedAccount),
  };
}
