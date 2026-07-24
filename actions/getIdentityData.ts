"use server";

import { cookies } from "next/headers";
import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { deduplicateByUri } from "src/utils/deduplicateRecords";
import { getProfiles, type Profile } from "src/identity";
import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
export const getIdentityData = cache(uncachedGetIdentityData);
async function uncachedGetIdentityData() {
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
            notifications(count),
            publication_subscriptions(*),
            publication_email_subscribers(publication, state),
            publication_memberships(publication, tier, status, current_period_end, cancel_at_period_end),
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
                title,
                description,
                permission_token_rights(*),
                leaflets_to_documents(*),
                leaflets_in_publications(*, publications(*))
              )
            ),
            user_subscriptions(plan, status, current_period_end),
            stripe_connected_accounts(stripe_account_id, charges_enabled, payouts_enabled, details_submitted),
            user_entitlements(entitlement_key, granted_at, expires_at, source, metadata),
            publications!publications_identity_did_fkey(*),
            leaflet_contributors!leaflet_contributors_contributor_did_fkey(
              created_at,
              permission_tokens!leaflet_contributors_leaflet_fkey!inner(
                id, root_entity, title, description,
                permission_token_rights(*),
                leaflets_to_documents(*),
                leaflets_in_publications(*, publications(*))
              )
            ),
            publication_contributors!publication_contributors_contributor_did_fkey(
              created_at,
              publications!publication_contributors_publication_uri_fkey!inner(*)
            )
          )`,
        )
        .eq("identities.notifications.read", false)
        .eq("identities.publication_contributors.confirmed", true)
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
  const connectedAccount =
    auth_res.data.identities.stripe_connected_accounts ?? null;

  // Pull the embedded raw rows off the identity. Spreading `identity` below
  // must not leak these raw embeds as extra top-level keys (the public return
  // shape exposes them only as the processed `publications`,
  // `contributor_publications`, and `contributor_leaflets`).
  const {
    publications: rawPublications,
    leaflet_contributors: contributorLeafletRows,
    publication_contributors: contributorPubRows,
    ...identity
  } = auth_res.data.identities;

  const atp_did = identity.atp_did;
  if (atp_did) {
    // Publications, leaflet_contributors, and publication_contributors are
    // folded into the main identities query above as embedded resources
    // (via the *_contributor_did_fkey / *_identity_did_fkey FKs to
    // identities.atp_did). getProfiles stays separate because it's an
    // external Redis/bsky profile cache, not a DB table.
    const profiles = await getProfiles([atp_did]);
    // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces,
    // then filter to only publications created by Leaflet
    const publications = deduplicateByUri(rawPublications || []).filter(
      isLeafletPublication,
    );
    const contributor_leaflets = (contributorLeafletRows ?? []).filter(
      (
        r,
      ): r is typeof r & {
        permission_tokens: NonNullable<typeof r.permission_tokens>;
      } => !!r.permission_tokens,
    );
    const rawContributorPubs = (contributorPubRows ?? [])
      .map((r) => r.publications)
      .filter((p): p is NonNullable<typeof p> => !!p);
    const contributor_publications =
      deduplicateByUri(rawContributorPubs).filter(isLeafletPublication);
    return {
      ...identity,
      bsky_profiles: bskyProfileFromCache(profiles.get(atp_did) ?? null),
      publications,
      contributor_publications,
      contributor_leaflets,
      entitlements,
      subscription,
      connectedAccount,
    };
  }

  return {
    ...identity,
    bsky_profiles: null,
    publications: [],
    contributor_publications: [],
    contributor_leaflets: [],
    entitlements,
    subscription,
    connectedAccount,
  };
}

// Reshape a cached profile into the legacy `bsky_profiles` row shape that
// consumers (SubscribeButton, PubPreview, PostPreview, …) read off the
// identity, so swapping the table join for the cache stays transparent.
function bskyProfileFromCache(profile: Profile | null) {
  if (!profile) return null;
  return {
    did: profile.did,
    handle: profile.handle,
    record: {
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName ?? undefined,
      avatar: profile.avatar ?? undefined,
      description: profile.description ?? undefined,
    },
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
