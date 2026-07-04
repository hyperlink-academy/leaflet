"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import { resolveAuthToken, setAuthToken } from "src/auth";
import { Err, Ok } from "src/result";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The saved-accounts list lives client-side (localStorage), so cap how much
// work a single resolve call can request.
const MAX_SAVED_ACCOUNTS = 12;

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

export type ResolvedAccount = {
  token: string;
  identity: { id: string; email: string | null; atp_did: string | null };
};

// Resolves client-held session tokens to the identities they still
// authenticate, in the caller's order. Possession of a token id is the
// credential — this never returns tokens the caller didn't already hold.
// Display data (handle/avatar) is not resolved here; the client renders the
// snapshot taken when the account was last active.
export async function resolveSavedAccounts(
  tokenIds: string[],
): Promise<ResolvedAccount[]> {
  const ids = [...new Set(tokenIds)]
    .filter((id) => UUID_REGEX.test(id))
    .slice(0, MAX_SAVED_ACCOUNTS);
  if (ids.length === 0) return [];

  const { data } = await supabaseServerClient
    .from("email_auth_tokens")
    .select("id, confirmed, identities(id, email, atp_did)")
    .in("id", ids);
  const byToken = new Map(
    (data ?? [])
      .filter((row) => row.confirmed && row.identities)
      .map((row) => [row.id, row.identities!]),
  );

  return ids.flatMap((id) => {
    const identity = byToken.get(id);
    if (!identity) return [];
    return [
      {
        token: id,
        identity: {
          id: identity.id,
          email: identity.email,
          atp_did: identity.atp_did,
        },
      },
    ];
  });
}

export async function switchAccount(tokenId: string) {
  if (!UUID_REGEX.test(tokenId)) return Err("invalid-token" as const);
  const resolved = await resolveAuthToken(tokenId);
  if (!resolved) return Err("invalid-token" as const);
  await setAuthToken(tokenId);
  return Ok({ identity: resolved.identity.id });
}
