"use server";

import { getIdentityData } from "actions/getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import { isAdminEmail } from "src/adminAllowlist";
import { getProfiles, idResolver } from "src/identity";

export type AdminEntitlementError =
  | "unauthorized"
  | "invalid_input"
  | "database_error";

export type AdminEntitlementRow = {
  entitlement_key: string;
  granted_at: string;
  expires_at: string | null;
  source: string | null;
};

export type AdminUserSearchResult = {
  id: string;
  email: string | null;
  atp_did: string | null;
  handle: string | null;
  displayName: string | null;
  entitlements: AdminEntitlementRow[];
};

async function getAdminIdentity() {
  let identity = await getIdentityData();
  if (!identity || !isAdminEmail(identity.email)) return null;
  return identity;
}

export async function searchUsers(
  query: string,
): Promise<Result<AdminUserSearchResult[], AdminEntitlementError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");

  let q = query.trim();
  if (!q) return Err("invalid_input");

  const select =
    "id, email, atp_did, user_entitlements(entitlement_key, granted_at, expires_at, source)";
  let matches: {
    id: string;
    email: string | null;
    atp_did: string | null;
    user_entitlements: AdminEntitlementRow[];
  }[] = [];

  if (q.startsWith("did:")) {
    let { data, error } = await supabaseServerClient
      .from("identities")
      .select(select)
      .eq("atp_did", q)
      .limit(10);
    if (error) return Err("database_error");
    matches = data ?? [];
  } else {
    // A bare word could be an email fragment or a bsky handle — run both.
    let { data, error } = await supabaseServerClient
      .from("identities")
      .select(select)
      .ilike("email", `%${q.replace(/[%_]/g, "\\$&")}%`)
      .limit(10);
    if (error) return Err("database_error");
    matches = data ?? [];

    if (!q.includes("@") || q.startsWith("@")) {
      let did = await idResolver.handle
        .resolve(q.replace(/^@/, ""))
        .catch(() => null);
      if (did) {
        let { data: byDid } = await supabaseServerClient
          .from("identities")
          .select(select)
          .eq("atp_did", did)
          .limit(1);
        for (let row of byDid ?? [])
          if (!matches.find((m) => m.id === row.id)) matches.push(row);
      }
    }
  }

  let dids = matches.map((m) => m.atp_did).filter((d): d is string => !!d);
  let profiles = await getProfiles(dids);

  return Ok(
    matches.map((m) => {
      let profile = m.atp_did ? profiles.get(m.atp_did) : null;
      return {
        id: m.id,
        email: m.email,
        atp_did: m.atp_did,
        handle: profile?.handle ?? null,
        displayName: profile?.displayName ?? null,
        entitlements: m.user_entitlements,
      };
    }),
  );
}

export async function grantEntitlement(args: {
  identityId: string;
  key: string;
  expiresAt?: string | null;
}): Promise<Result<AdminEntitlementRow, AdminEntitlementError>> {
  let admin = await getAdminIdentity();
  if (!admin) return Err("unauthorized");

  let key = args.key.trim();
  if (!key) return Err("invalid_input");

  let expires_at: string | null = null;
  if (args.expiresAt) {
    let parsed = new Date(args.expiresAt);
    if (isNaN(parsed.getTime())) return Err("invalid_input");
    expires_at = parsed.toISOString();
  }

  let { data, error } = await supabaseServerClient
    .from("user_entitlements")
    .upsert(
      {
        identity_id: args.identityId,
        entitlement_key: key,
        expires_at,
        source: "admin",
        metadata: { granted_by: admin.email },
      },
      { onConflict: "identity_id,entitlement_key" },
    )
    .select("entitlement_key, granted_at, expires_at, source")
    .single();
  if (error || !data) {
    console.error("[admin/entitlements] grant failed:", error);
    return Err("database_error");
  }
  return Ok(data);
}

export async function revokeAllForKey(args: {
  key: string;
}): Promise<Result<{ removed: number }, AdminEntitlementError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");

  let key = args.key.trim();
  if (!key) return Err("invalid_input");

  let { data, error } = await supabaseServerClient
    .from("user_entitlements")
    .delete()
    .eq("entitlement_key", key)
    .select("identity_id");
  if (error) {
    console.error("[admin/entitlements] revoke-all failed:", error);
    return Err("database_error");
  }
  return Ok({ removed: (data ?? []).length });
}

export async function revokeEntitlement(args: {
  identityId: string;
  key: string;
}): Promise<Result<null, AdminEntitlementError>> {
  if (!(await getAdminIdentity())) return Err("unauthorized");

  let { error } = await supabaseServerClient
    .from("user_entitlements")
    .delete()
    .eq("identity_id", args.identityId)
    .eq("entitlement_key", args.key);
  if (error) {
    console.error("[admin/entitlements] revoke failed:", error);
    return Err("database_error");
  }
  return Ok(null);
}
