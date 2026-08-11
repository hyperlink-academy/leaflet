import { cookies, headers } from "next/headers";
import { cache } from "react";
import { supabaseServerClient } from "supabase/serverClient";
import { isProductionDomain } from "./utils/isProductionDeployment";
import { isUuid } from "./utils/isUuid";
import {
  getValidAuthToken,
  keyEntitlements,
  processConnectedAccount,
} from "./identityPayload";
import { SESSION_MARKER_COOKIE } from "./sessionMarker";

export const AUTH_TOKEN_COOKIE = "auth_token";
// pending_merge_token carries a freshly-minted email_auth_token for the target
// identity while the user decides whether to merge. Short-lived; confirm turns
// it into the real auth_token, cancel just clears it.
export const PENDING_MERGE_TOKEN_COOKIE = "pending_merge_token";

export async function setAuthToken(tokenID: string) {
  let c = await cookies();
  let host = (await headers()).get("host");
  c.set(AUTH_TOKEN_COOKIE, tokenID, {
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
    domain: isProductionDomain() ? host! : undefined,
    httpOnly: true,
    sameSite: "lax",
  });
  c.set(SESSION_MARKER_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
    domain: isProductionDomain() ? host! : undefined,
    httpOnly: false,
    sameSite: "lax",
  });
}

export async function setPendingMergeToken(tokenID: string) {
  let c = await cookies();
  let host = (await headers()).get("host");
  c.set(PENDING_MERGE_TOKEN_COOKIE, tokenID, {
    maxAge: 60 * 15,
    secure: process.env.NODE_ENV === "production",
    domain: isProductionDomain() ? host! : undefined,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function removePendingMergeToken() {
  let c = await cookies();
  c.delete({
    name: PENDING_MERGE_TOKEN_COOKIE,
    domain: isProductionDomain() ? ".leaflet.pub" : undefined,
  });
}

// Resolves a cookie-held email_auth_token id to the identity it authenticates.
// Returns null unless the token is confirmed and the identity row exists.
export async function resolveAuthToken(tokenId: string | undefined) {
  if (!tokenId || !isUuid(tokenId)) return null;
  const { data } = await supabaseServerClient
    .from("email_auth_tokens")
    .select("id, confirmed, identities(id, email, atp_did)")
    .eq("id", tokenId)
    .maybeSingle();
  if (!data?.confirmed || !data.identities) return null;
  return { tokenId: data.id, identity: data.identities };
}

// The auth gate for server actions and RPC handlers: the identity row plus the
// two things authorization actually branches on (entitlements, connected
// Stripe account). Same token validation as getIdentityData, but none of its
// page-data embeds — server actions are separate requests, so React cache()
// never dedupes them and each one would otherwise pay for the caller's whole
// home-page fact tree. Deliberately not a "use server" module: exporting an
// async fn from one would publish it as a client-callable endpoint.
export const getAuthIdentity = cache(uncachedGetAuthIdentity);
async function uncachedGetAuthIdentity() {
  let auth_token = await getValidAuthToken();
  let auth_res = auth_token
    ? await supabaseServerClient
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            user_entitlements(entitlement_key, granted_at, expires_at, source, metadata),
            stripe_connected_accounts(stripe_account_id, charges_enabled, payouts_enabled, details_submitted, requirements)
          )`,
        )
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;

  // Pull the raw embeds off the identity so spreading it below doesn't leak
  // them alongside the processed `entitlements` / `connectedAccount`.
  const {
    user_entitlements: entitlementRows,
    stripe_connected_accounts: connectedAccount,
    ...identity
  } = auth_res.data.identities;

  return {
    ...identity,
    entitlements: keyEntitlements(entitlementRows),
    connectedAccount: processConnectedAccount(connectedAccount),
  };
}
