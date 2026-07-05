"use server";

import { cookies } from "next/headers";
import { resolveAuthToken } from "src/auth";

// The auth_token cookie is httpOnly, so the client can't read its own session
// token. This hands the token back to the session it already authenticates,
// letting the client remember it in the saved-accounts list for switching.
// Only the first-party cookie qualifies: the cross-domain mirror
// (external_auth_token) is excluded so a custom domain never persists a
// switchable token in its localStorage.
export async function getCurrentSessionToken() {
  const cookieStore = await cookies();
  const tokenId = cookieStore.get("auth_token")?.value;
  const resolved = await resolveAuthToken(tokenId);
  if (!resolved) return null;
  return { token: resolved.tokenId, identity: resolved.identity.id };
}
