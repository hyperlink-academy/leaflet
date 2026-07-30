"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { getProfiles, type Profile } from "src/identity";
import { isUuid } from "src/utils/isUuid";
import type { getIdentityData } from "./getIdentityData";

type Identity = Awaited<ReturnType<typeof getIdentityData>>;

// The published-page counterpart to getIdentityData: everything interaction
// components need (viewer profile, subscriptions, memberships, entitlements)
// without the dashboard-only embeds — home_leaflet alone carries the full
// fact set of the user's home page. Returns the exact Identity shape with the
// omitted embeds empty so every consumer type-checks against either source;
// the `Promise<Identity>` annotation is the drift guard.
export const getViewerIdentity = cache(uncachedGetViewerIdentity);
async function uncachedGetViewerIdentity(): Promise<Identity> {
  let cookieStore = await cookies();
  let auth_token =
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value;
  if (auth_token && !isUuid(auth_token)) return null;
  let auth_res = auth_token
    ? await supabaseServerClient
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            notifications(count),
            publication_subscriptions(*),
            publication_email_subscribers(publication, state),
            publication_memberships(publication, tier, status, current_period_end, cancel_at_period_end),
            user_subscriptions(plan, status, current_period_end),
            stripe_connected_accounts(stripe_account_id, charges_enabled, payouts_enabled, details_submitted),
            user_entitlements(entitlement_key, granted_at, expires_at, source, metadata)
          )`,
        )
        .eq("identities.notifications.read", false)
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;
  const identity = auth_res.data.identities;

  const now = new Date().toISOString();
  const entitlements: Record<
    string,
    {
      granted_at: string;
      expires_at: string | null;
      source: string | null;
      metadata: unknown;
    }
  > = {};
  for (const row of identity.user_entitlements || []) {
    if (row.expires_at && row.expires_at < now) continue;
    entitlements[row.entitlement_key] = {
      granted_at: row.granted_at,
      expires_at: row.expires_at,
      source: row.source,
      metadata: row.metadata,
    };
  }

  const profiles = identity.atp_did
    ? await getProfiles([identity.atp_did])
    : null;

  return {
    ...identity,
    custom_domains: [],
    home_leaflet: null,
    permission_token_on_homepage: [],
    bsky_profiles:
      identity.atp_did && profiles
        ? bskyProfileFromCache(profiles.get(identity.atp_did) ?? null)
        : null,
    publications: [],
    contributor_publications: [],
    contributor_leaflets: [],
    entitlements,
    subscription: identity.user_subscriptions ?? null,
    connectedAccount: identity.stripe_connected_accounts ?? null,
  };
}

function bskyProfileFromCache(profile: Profile | null) {
  if (!profile) return null;
  return {
    did: profile.did,
    handle: profile.handle,
    record: {
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName ?? undefined,
      avatar: profile.avatar ?? undefined,
      description: profile.description ?? undefined,
    },
  };
}
