import Link from "next/link";
import { notFound } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { isAdminEmail } from "src/adminAllowlist";
import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { KNOWN_ENTITLEMENT_KEYS } from "src/entitlements";
import {
  AdminEntitlements,
  type GrantRow,
  type KeySummary,
} from "./AdminEntitlements";

export const metadata = {
  title: "Entitlements Admin",
};

export default async function AdminPage() {
  let identity = await getIdentityData();
  // 404 rather than a login/denied screen so the route stays invisible to
  // non-admins.
  if (!isAdminEmail(identity?.email)) notFound();

  let { data: grants } = await supabaseServerClient
    .from("user_entitlements")
    .select(
      "identity_id, entitlement_key, granted_at, expires_at, source, identities!inner(email, atp_did)",
    )
    .order("granted_at", { ascending: false });

  let dids = [
    ...new Set(
      (grants ?? [])
        .map((g) => g.identities.atp_did)
        .filter((d): d is string => !!d),
    ),
  ];
  let profiles = await getProfiles(dids);

  let rows: GrantRow[] = (grants ?? []).map((g) => ({
    identity_id: g.identity_id,
    entitlement_key: g.entitlement_key,
    granted_at: g.granted_at,
    expires_at: g.expires_at,
    source: g.source,
    email: g.identities.email,
    atp_did: g.identities.atp_did,
    handle: g.identities.atp_did
      ? profiles.get(g.identities.atp_did)?.handle ?? null
      : null,
  }));

  // The key list is derived from what's actually granted, merged with the
  // keys the code checks so unused ones are still grantable.
  let holderCounts = new Map<string, number>();
  for (let row of rows)
    holderCounts.set(
      row.entitlement_key,
      (holderCounts.get(row.entitlement_key) ?? 0) + 1,
    );
  let keys: KeySummary[] = [
    ...new Set([...KNOWN_ENTITLEMENT_KEYS, ...holderCounts.keys()]),
  ]
    .sort()
    .map((key) => ({
      key,
      holders: holderCounts.get(key) ?? 0,
      knownToCode: KNOWN_ENTITLEMENT_KEYS.includes(key),
    }));

  return (
    <>
      <div className="w-full max-w-2xl mx-auto px-4 pt-8 -mb-8 flex justify-end">
        <Link
          href="/admin/import-subscribers"
          className="text-sm text-accent-contrast hover:underline"
        >
          Import email subscribers →
        </Link>
      </div>
      <AdminEntitlements grants={rows} keys={keys} />
    </>
  );
}
