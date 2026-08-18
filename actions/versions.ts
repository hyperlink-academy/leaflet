"use server";

import { drizzle } from "drizzle-orm/node-postgres";

import { pool } from "supabase/pool";
import { supabaseServerClient } from "supabase/serverClient";
import { getAuthIdentity } from "src/auth";
import { isUuid } from "src/utils/isUuid";
import { Ok, Err, type Result } from "src/result";
import { cutVersion } from "src/versioning/cutVersion";

export type DocumentVersionListing = {
  id: string;
  name: string | null;
  kind: string;
  created_at: string;
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
    .select("id, name, kind, created_at")
    .eq("token", tokenId)
    .order("created_at", { ascending: false });
  if (error) return Err("Couldn't load versions");
  return Ok(data ?? []);
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
      }),
    );
    return Ok({ unchanged: !cut });
  } finally {
    client.release();
  }
}
