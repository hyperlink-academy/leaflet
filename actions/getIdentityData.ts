"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { deduplicateByUri } from "src/utils/deduplicateRecords";
import { getProfiles } from "src/identity";
import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";
import {
  bskyProfileFromCache,
  ENTITLEMENT_EMBEDS,
  getValidAuthToken,
  keyEntitlements,
  SUBSCRIPTION_STATE_EMBEDS,
} from "src/identityPayload";
export const getIdentityData = cache(uncachedGetIdentityData);
async function uncachedGetIdentityData() {
  let auth_token = await getValidAuthToken();
  let auth_res = auth_token
    ? await supabaseServerClient
        .from("email_auth_tokens")
        .select(
          `*,
          identities(
            *,
            ${SUBSCRIPTION_STATE_EMBEDS},
            custom_domains!custom_domains_identity_id_fkey(publication_domains(*, publications(name)), custom_domain_routes(*), *),
            permission_token_on_homepage(
              archived,
              created_at,
              permission_tokens!inner(
                id,
                root_entity,
                title,
                description,
                permission_token_rights(*),
                leaflets_to_documents(*, documents(uri, indexed_at, data)),
                leaflets_in_publications(*, documents(uri, indexed_at, data), publications(uri, record))
              )
            ),
            ${ENTITLEMENT_EMBEDS},
            publications!publications_identity_did_fkey(*),
            leaflet_contributors!leaflet_contributors_contributor_did_fkey(
              created_at,
              permission_tokens!leaflet_contributors_leaflet_fkey!inner(
                id, root_entity, title, description,
                permission_token_rights(*),
                leaflets_to_documents(*, documents(uri, indexed_at, data)),
                leaflets_in_publications(*, documents(uri, indexed_at, data), publications(uri, record))
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

  // Pull the embedded raw rows off the identity. Spreading `identity` below
  // must not leak these raw embeds as extra top-level keys (the public return
  // shape exposes them only as the processed `publications`,
  // `contributor_publications`, `contributor_leaflets`, `entitlements`,
  // `subscription`, and `connectedAccount`).
  const {
    publications: rawPublications,
    leaflet_contributors: contributorLeafletRows,
    publication_contributors: contributorPubRows,
    user_entitlements: entitlementRows,
    user_subscriptions: subscription,
    stripe_connected_accounts: connectedAccount,
    ...identity
  } = auth_res.data.identities;

  const entitlements = keyEntitlements(entitlementRows);

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
      // Orders identity snapshots by when they were fetched, so the client
      // provider can drop a stale seed (e.g. from a nav payload prefetched
      // before a client-side revalidation) instead of overwriting newer data.
      fetched_at: Date.now(),
      bsky_profiles: bskyProfileFromCache(profiles.get(atp_did) ?? null),
      publications,
      contributor_publications,
      contributor_leaflets,
      entitlements,
      subscription: subscription ?? null,
      connectedAccount: connectedAccount ?? null,
    };
  }

  return {
    ...identity,
    fetched_at: Date.now(),
    bsky_profiles: null,
    publications: [],
    contributor_publications: [],
    contributor_leaflets: [],
    entitlements,
    subscription: subscription ?? null,
    connectedAccount: connectedAccount ?? null,
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
