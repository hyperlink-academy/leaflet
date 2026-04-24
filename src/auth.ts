import { cookies, headers } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import { isProductionDomain } from "./utils/isProductionDeployment";

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

export async function removeAuthToken() {
  let c = await cookies();
  c.delete({
    name: AUTH_TOKEN_COOKIE,
    domain: isProductionDomain() ? ".leaflet.pub" : undefined,
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
  if (!tokenId) return null;
  const { data } = await supabaseServerClient
    .from("email_auth_tokens")
    .select("id, confirmed, identities(id, email, atp_did)")
    .eq("id", tokenId)
    .maybeSingle();
  if (!data?.confirmed || !data.identities) return null;
  return { tokenId: data.id, identity: data.identities };
}
