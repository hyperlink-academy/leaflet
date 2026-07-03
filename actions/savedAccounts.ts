"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import { resolveAuthToken, setAuthToken } from "src/auth";
import { getProfiles, type Profile } from "src/identity";
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

export type SavedAccount = {
  token: string;
  identity: { id: string; email: string | null; atp_did: string | null };
  profile: {
    handle: string | null;
    displayName: string | null;
    avatar: string | null;
  } | null;
};

// Resolves client-held session tokens into display data for the switcher.
// Returns only tokens that still authenticate, in the caller's (MRU) order,
// collapsing entries that resolve to the same identity (e.g. after an account
// merge reassigns tokens). Possession of a token id is the credential — this
// never returns tokens the caller didn't already hold.
export async function resolveSavedAccounts(
  tokenIds: string[],
): Promise<SavedAccount[]> {
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
      .map((row) => [row.id, row]),
  );

  const dids = [...byToken.values()]
    .map((row) => row.identities!.atp_did)
    .filter((did): did is string => !!did);
  const profiles: Map<string, Profile | null> =
    dids.length > 0 ? await getProfiles(dids) : new Map();

  const seenIdentities = new Set<string>();
  const accounts: SavedAccount[] = [];
  for (const id of ids) {
    const row = byToken.get(id);
    if (!row?.identities || seenIdentities.has(row.identities.id)) continue;
    seenIdentities.add(row.identities.id);
    const profile = row.identities.atp_did
      ? (profiles.get(row.identities.atp_did) ?? null)
      : null;
    accounts.push({
      token: row.id,
      identity: {
        id: row.identities.id,
        email: row.identities.email,
        atp_did: row.identities.atp_did,
      },
      profile: profile
        ? {
            handle: profile.handle,
            displayName: profile.displayName,
            avatar: profile.avatar,
          }
        : null,
    });
  }
  return accounts;
}

export async function switchAccount(tokenId: string) {
  if (!UUID_REGEX.test(tokenId)) return Err("invalid-token" as const);
  const resolved = await resolveAuthToken(tokenId);
  if (!resolved) return Err("invalid-token" as const);
  await setAuthToken(tokenId);
  return Ok({ identity: resolved.identity.id });
}
