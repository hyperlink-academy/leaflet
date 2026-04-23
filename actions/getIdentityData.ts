"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { deduplicateByUri } from "src/utils/deduplicateRecords";
import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
export const getIdentityData = cache(uncachedGetIdentityData);
export async function uncachedGetIdentityData() {
  let cookieStore = await cookies();
  let auth_token =
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value;
  let auth_res = auth_token
    ? await supabaseServerClient
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            bsky_profiles(*),
            notifications(count),
            publication_subscriptions(*),
            publication_email_subscribers(publication, state),
            custom_domains!custom_domains_identity_id_fkey(publication_domains(*, publications(name)), custom_domain_routes(*), *),
            home_leaflet:permission_tokens!identities_home_page_fkey(*, permission_token_rights(*,
                              entity_sets(entities(facts(*)))
            )),
            permission_token_on_homepage(
              archived,
              created_at,
              permission_tokens!inner(
                id,
                root_entity,
                permission_token_rights(*),
                leaflets_to_documents(*, documents(*)),
                leaflets_in_publications(*, publications(*), documents(*))
              )
            ),
            user_subscriptions(plan, status, current_period_end),
            user_entitlements(entitlement_key, granted_at, expires_at, source, metadata)
          )`,
        )
        .eq("identities.notifications.read", false)
        .eq("id", auth_token)
        .eq("confirmed", true)
        .single()
    : null;
  if (!auth_res?.data?.identities) return null;

  // Transform embedded entitlements into a keyed record, filtering expired
  const now = new Date().toISOString();
  const entitlements: Record<
    string,
    {
      granted_at: string;
      expires_at: string | null;
      source: string | null;
      metadata: unknown;
    }
  > = {};
  for (const row of auth_res.data.identities.user_entitlements || []) {
    if (row.expires_at && row.expires_at < now) continue;
    entitlements[row.entitlement_key] = {
      granted_at: row.granted_at,
      expires_at: row.expires_at,
      source: row.source,
      metadata: row.metadata,
    };
  }

  const subscription = auth_res.data.identities.user_subscriptions ?? null;

  if (auth_res.data.identities.atp_did) {
    //I should create a relationship table so I can do this in the above query
    let { data: rawPublications } = await supabaseServerClient
      .from("publications")
      .select("*")
      .eq("identity_did", auth_res.data.identities.atp_did);
    // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces,
    // then filter to only publications created by Leaflet
    const publications = deduplicateByUri(rawPublications || []).filter(
      isLeafletPublication,
    );
    return {
      ...auth_res.data.identities,
      publications,
      entitlements,
      subscription,
    };
  }

  return {
    ...auth_res.data.identities,
    publications: [],
    entitlements,
    subscription,
  };
}

function isLeafletPublication(p: { uri: string; record: unknown }): boolean {
  try {
    const rkey = new AtUri(p.uri).rkey;
    if (!TID.is(rkey)) return false;
  } catch {
    return false;
  }

  const record = p.record as Record<string, any> | null;
  if (!record) return true;

  if (record.preferences?.greengale) return false;

  if (
    record.theme &&
    record.theme.$type &&
    record.theme.$type !== "pub.leaflet.publication#theme"
  )
    return false;

  return true;
}
