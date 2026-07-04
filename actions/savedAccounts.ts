"use server";

import { cookies } from "next/headers";
import { resolveAuthToken, setAuthToken } from "src/auth";
import { Err, Ok } from "src/result";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The auth_token cookie is httpOnly, so the client can't read its own session
// token. This hands the token back to the session it already authenticates,
// letting the client remember it in the saved-accounts list for switching.
export async function getCurrentSessionToken() {
  const cookieStore = await cookies();
  const tokenId =
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value;
  const resolved = await resolveAuthToken(tokenId);
  if (!resolved) return null;
  return { token: resolved.tokenId, identity: resolved.identity.id };
}

// Rewrites the auth_token cookie to another session this browser holds.
// Possession of the token id is the credential; the saved-accounts list is
// never validated ahead of time, so a revoked session surfaces here as
// Err and the caller drops the entry.
export async function switchAccount(tokenId: string) {
  if (!UUID_REGEX.test(tokenId)) return Err("invalid-token" as const);
  const resolved = await resolveAuthToken(tokenId);
  if (!resolved) return Err("invalid-token" as const);
  await setAuthToken(tokenId);
  return Ok({ identity: resolved.identity.id });
}
