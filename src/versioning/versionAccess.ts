import { cache } from "react";

import { getAuthIdentity } from "src/auth";
import { isPro, PRO_ENTITLEMENT_KEY } from "src/entitlements";
import { isUuid } from "src/utils/isUuid";
import { supabaseServerClient } from "supabase/serverClient";

// Versioning is a Leaflet Pro feature, but it's the *document* that carries the
// entitlement: a doc owned by a Pro user keeps its history visible to every
// collaborator, while the writes (save, restore, fork) stay with Pro viewers.
// Resolved server-side because nothing in the editor's client payload carries
// anyone else's entitlements. Deliberately not a "use server" module.
export type VersionAccess = {
  // Whether this document has a version history at all.
  enabled: boolean;
  // Whether the viewer may save, restore, or fork versions of it.
  canModify: boolean;
};

export const NO_VERSION_ACCESS: VersionAccess = {
  enabled: false,
  canModify: false,
};

export const getVersionAccess = cache(uncachedGetVersionAccess);
async function uncachedGetVersionAccess(
  tokenId: string,
): Promise<VersionAccess> {
  if (!isUuid(tokenId)) return NO_VERSION_ACCESS;
  let identity = await getAuthIdentity();
  if (isPro(identity?.entitlements)) return { enabled: true, canModify: true };
  return { enabled: await documentHasProOwner(tokenId), canModify: false };
}
async function documentHasProOwner(tokenId: string) {
  let [homepage, inPublication, draftOf] = await Promise.all([
    supabaseServerClient
      .from("permission_token_on_homepage")
      .select("identity")
      .eq("token", tokenId),
    supabaseServerClient
      .from("leaflets_in_publications")
      .select(
        "publications!leaflets_in_publications_publication_fkey(identity_did)",
      )
      .eq("leaflet", tokenId),
    supabaseServerClient
      .from("publications")
      .select("identity_did")
      .eq("draft_leaflet", tokenId),
  ]);

  let identityIds = new Set((homepage.data ?? []).map((row) => row.identity));
  let dids = new Set([
    ...(inPublication.data ?? []).flatMap((row) =>
      row.publications ? [row.publications.identity_did] : [],
    ),
    ...(draftOf.data ?? []).map((row) => row.identity_did),
  ]);

  if (dids.size > 0) {
    let { data } = await supabaseServerClient
      .from("identities")
      .select("id")
      .in("atp_did", [...dids]);
    for (let row of data ?? []) identityIds.add(row.id);
  }
  if (identityIds.size === 0) return false;

  let { data: grants } = await supabaseServerClient
    .from("user_entitlements")
    .select("expires_at")
    .eq("entitlement_key", PRO_ENTITLEMENT_KEY)
    .in("identity_id", [...identityIds]);

  // Mirrors keyEntitlements' expiry handling, which is what isPro sees.
  let now = new Date().toISOString();
  return (grants ?? []).some((g) => !g.expires_at || g.expires_at >= now);
}
