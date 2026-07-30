import { cookies } from "next/headers";
import { isUuid } from "./utils/isUuid";
import type { Profile } from "./identity";

// Shared plumbing for the three identity fetchers (getIdentityData,
// getViewerIdentity, getAuthIdentity). Deliberately not a "use server" module:
// exporting an async fn from one would publish it as a client-callable
// endpoint.

// A cookie value that isn't a uuid can't match any email_auth_tokens row, so
// treating it as absent skips a guaranteed-empty query.
export async function getValidAuthToken() {
  let cookieStore = await cookies();
  let auth_token =
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value;
  if (!auth_token || !isUuid(auth_token)) return null;
  return auth_token;
}

export type EntitlementRow = {
  entitlement_key: string;
  granted_at: string;
  expires_at: string | null;
  source: string | null;
  metadata: unknown;
};

export type Entitlements = Record<
  string,
  {
    granted_at: string;
    expires_at: string | null;
    source: string | null;
    metadata: unknown;
  }
>;

// Keys the embedded entitlement rows by entitlement_key, dropping expired ones.
export function keyEntitlements(
  rows: EntitlementRow[] | null | undefined,
): Entitlements {
  const now = new Date().toISOString();
  const entitlements: Entitlements = {};
  for (const row of rows || []) {
    if (row.expires_at && row.expires_at < now) continue;
    entitlements[row.entitlement_key] = {
      granted_at: row.granted_at,
      expires_at: row.expires_at,
      source: row.source,
      metadata: row.metadata,
    };
  }
  return entitlements;
}

// Reshape a cached profile into the legacy `bsky_profiles` row shape that
// consumers (SubscribeButton, PubPreview, PostPreview, …) read off the
// identity, so swapping the table join for the cache stays transparent.
export function bskyProfileFromCache(profile: Profile | null) {
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
