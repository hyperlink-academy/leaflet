"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { getProfiles } from "src/identity";
import {
  bskyProfileFromCache,
  getValidAuthToken,
  keyEntitlements,
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
  let auth_token = await getValidAuthToken();
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
    connectedAccount: connectedAccount ?? null,
  };
}
