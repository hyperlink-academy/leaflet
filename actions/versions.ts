"use server";

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { pool } from "supabase/pool";
import { supabaseServerClient } from "supabase/serverClient";
import { getAuthIdentity } from "src/auth";
import { getProfiles } from "src/identity/profileCache";
import { isUuid } from "src/utils/isUuid";
import { Ok, Err, type Result } from "src/result";
import { cutVersion, type SnapshotFact } from "src/versioning/cutVersion";
import { restoreDocumentVersion } from "src/versioning/restoreVersion";
import { copyLeafletContents } from "src/utils/copyLeafletContents";
import type { PermissionToken } from "src/replicache";

export type DocumentVersionListing = {
  id: string;
  name: string | null;
  kind: string;
  created_at: string;
  author_name: string | null;
};

async function getWritableToken(tokenId: string) {
  if (!isUuid(tokenId)) return null;
  let { data } = await supabaseServerClient
    .from("permission_tokens")
    .select("id, root_entity, blocked_by_admin, permission_token_rights(*)")
    .eq("id", tokenId)
    .single();
  if (!data || data.blocked_by_admin) return null;
  return data.permission_token_rights.some((right) => right.write)
    ? data
    : null;
}

export async function getVersions(
  tokenId: string,
): Promise<Result<DocumentVersionListing[], string>> {
  if (!(await getWritableToken(tokenId))) return Err("No access");

  let { data, error } = await supabaseServerClient
    .from("document_versions")
    .select("id, name, kind, created_at, author_did, identities(email)")
    .eq("token", tokenId)
    .order("created_at", { ascending: false });
  if (error) return Err("Couldn't load versions");

  let dids = [
    ...new Set(
      (data ?? []).flatMap((v) => (v.author_did ? [v.author_did] : [])),
    ),
  ];
  let profiles = dids.length > 0 ? await getProfiles(dids) : new Map();

  return Ok(
    (data ?? []).map(({ author_did, identities, ...version }) => {
      let profile = author_did ? profiles.get(author_did) : null;
      return {
        ...version,
        author_name:
          profile?.displayName ||
          (profile?.handle ? `@${profile.handle}` : null) ||
          identities?.email ||
          null,
      };
    }),
  );
}

export async function saveVersion(
  tokenId: string,
  name: string | null,
): Promise<Result<{ unchanged: boolean }, string>> {
  let token = await getWritableToken(tokenId);
  if (!token) return Err("You don't have permission to save versions");
  let identity = await getAuthIdentity();

  const client = await pool.connect();
  try {
    const db = drizzle(client);
    let cut = await db.transaction((tx) =>
      cutVersion(tx, {
        tokenId,
        rootEntity: token.root_entity,
        kind: "named",
        name: name?.trim() || null,
        authorDid: identity?.atp_did ?? null,
        authorIdentity: identity?.id ?? null,
      }),
    );
    return Ok({ unchanged: !cut });
  } finally {
    client.release();
  }
}

export async function restoreVersion(
  tokenId: string,
  versionId: string,
): Promise<Result<null, string>> {
  if (!isUuid(versionId)) return Err("Version not found");
  let token = await getWritableToken(tokenId);
  if (!token) return Err("You don't have permission to restore versions");
  let identity = await getAuthIdentity();

  let result = await restoreDocumentVersion({
    tokenId,
    versionId,
    authorDid: identity?.atp_did ?? null,
    authorIdentity: identity?.id ?? null,
  });
  return result.ok ? Ok(null) : Err(result.error);
}

export async function forkVersionAsNewLeaflet(
  tokenId: string,
  versionId: string,
): Promise<Result<{ token: PermissionToken }, string>> {
  if (!isUuid(versionId)) return Err("Version not found");
  let token = await getWritableToken(tokenId);
  if (!token) return Err("You don't have permission to copy versions");

  let { data: version } = await supabaseServerClient
    .from("document_versions")
    .select("name, snapshot")
    .eq("id", versionId)
    .eq("token", tokenId)
    .single();
  if (!version?.snapshot) return Err("Version not found");

  let auth_token = (await cookies()).get("auth_token")?.value;
  let { permTokenId } = await copyLeafletContents({
    rootEntity: token.root_entity,
    facts: version.snapshot as unknown as SnapshotFact[],
    title: version.name,
    tailCte: auth_token
      ? ({ permTokenId }) => sql`, homepage_insert AS (
          INSERT INTO permission_token_on_homepage (token, identity)
          SELECT ${permTokenId}, identities.id
          FROM email_auth_tokens
          JOIN identities ON email_auth_tokens.identity = identities.id
          WHERE email_auth_tokens.id = ${auth_token}
            AND email_auth_tokens.confirmed = true
        )`
      : undefined,
  });

  let { data: newToken } = await supabaseServerClient
    .from("permission_tokens")
    .select("id, root_entity, permission_token_rights(*)")
    .eq("id", permTokenId)
    .single();
  if (!newToken) return Err("Couldn't create the new leaflet");
  return Ok({ token: newToken });
}
