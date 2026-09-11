"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { cache } from "react";
import { deduplicateByUri } from "src/utils/deduplicateRecords";
import { isLeafletManagedPublication } from "src/utils/isLeafletManagedPublication";
import { getProfilesFromCache } from "src/identity";
import {
  bskyProfileFromCache,
  ENTITLEMENT_EMBEDS,
  getValidAuthToken,
  keyEntitlements,
  processConnectedAccount,
  SUBSCRIPTION_STATE_EMBEDS,
} from "src/identityPayload";
import { getCachedIdentity, writeCachedIdentity } from "src/identityCache";

export const getIdentityData = cache(async () => {
  let auth_token = await getValidAuthToken();
  if (!auth_token) return null;
  return getCachedIdentity(auth_token, () => fetchIdentityByToken(auth_token));
});

// The client provider's revalidation path: always authoritative (it runs right
// after a mutation) and it warms the cache for the next server render.
export async function getFreshIdentityData() {
  let auth_token = await getValidAuthToken();
  if (!auth_token) return null;
  let identity = await fetchIdentityByToken(auth_token);
  await writeCachedIdentity(auth_token, identity);
  return identity;
}

// Only the published-record fields getDocumentURL needs. The whole record is
// the largest thing in this payload — every page of every published leaflet on
// the home page — and nothing the identity feeds reads the rest of it.
const DOCUMENT_URL_FIELDS = `uri, indexed_at, type:data->>"$type", path:data->>path, site:data->>site, publishedAt:data->>publishedAt, publication:data->>publication, author:data->>author`;

type DocumentUrlRow = {
  uri: string;
  indexed_at: string;
  type: string | null;
  path: string | null;
  site: string | null;
  publishedAt: string | null;
  publication: string | null;
  author: string | null;
};

type DocumentRecordRow = {
  uri: string;
  indexed_at: string;
  data: {
    $type: string | null;
    path: string | null;
    site: string | null;
    publishedAt: string | null;
    publication: string | null;
    author: string | null;
  };
};

type WithDocumentRecord<T extends { documents: DocumentUrlRow | null }> = Omit<
  T,
  "documents"
> & { documents: DocumentRecordRow | null };

// Rebuilds the `data` shape consumers (normalizeDocumentRecord) expect.
function withDocumentRecord<T extends { documents: DocumentUrlRow | null }>(
  row: T,
): WithDocumentRecord<T> {
  const doc = row.documents;
  return {
    ...row,
    documents: doc
      ? {
          uri: doc.uri,
          indexed_at: doc.indexed_at,
          data: {
            $type: doc.type,
            path: doc.path,
            site: doc.site,
            publishedAt: doc.publishedAt,
            publication: doc.publication,
            author: doc.author,
          },
        }
      : null,
  };
}

function withDocumentRecords<
  T extends {
    leaflets_to_documents: { documents: DocumentUrlRow | null }[];
    leaflets_in_publications: { documents: DocumentUrlRow | null }[];
  },
>(
  token: T,
): Omit<T, "leaflets_to_documents" | "leaflets_in_publications"> & {
  leaflets_to_documents: WithDocumentRecord<
    T["leaflets_to_documents"][number]
  >[];
  leaflets_in_publications: WithDocumentRecord<
    T["leaflets_in_publications"][number]
  >[];
} {
  return {
    ...token,
    leaflets_to_documents: token.leaflets_to_documents.map(withDocumentRecord),
    leaflets_in_publications:
      token.leaflets_in_publications.map(withDocumentRecord),
  };
}

async function fetchIdentityByToken(auth_token: string) {
  let auth_res = await supabaseServerClient
    .from("email_auth_tokens")
    .select(
      `*,
          identities(
            *,
            ${SUBSCRIPTION_STATE_EMBEDS},
            custom_domains!custom_domains_identity_id_fkey(publication_domains(*, publications(name)), custom_domain_routes(*, leaflet:permission_tokens!custom_domain_routes_edit_permission_token_fkey(title, leaflets_in_publications(title), leaflets_to_documents(title))), *),
            permission_token_on_homepage(
              archived,
              created_at,
              permission_tokens!inner(
                id,
                root_entity,
                title,
                description,
                permission_token_rights(*),
                leaflets_to_documents(*, documents(${DOCUMENT_URL_FIELDS})),
                leaflets_in_publications(*, documents(${DOCUMENT_URL_FIELDS}), publications(uri, record))
              )
            ),
            ${ENTITLEMENT_EMBEDS},
            publications!publications_identity_did_fkey(*),
            leaflet_contributors!leaflet_contributors_contributor_did_fkey(
              created_at,
              permission_tokens!leaflet_contributors_leaflet_fkey!inner(
                id, root_entity, title, description,
                permission_token_rights(*),
                leaflets_to_documents(*, documents(${DOCUMENT_URL_FIELDS})),
                leaflets_in_publications(*, documents(${DOCUMENT_URL_FIELDS}), publications(uri, record))
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
    .single();
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
    permission_token_on_homepage: homepageRows,
    user_entitlements: entitlementRows,
    user_subscriptions: subscription,
    stripe_connected_accounts: connectedAccount,
    ...identity
  } = auth_res.data.identities;

  const permission_token_on_homepage = homepageRows.map((r) => ({
    ...r,
    permission_tokens: withDocumentRecords(r.permission_tokens),
  }));
  const entitlements = keyEntitlements(entitlementRows);

  const atp_did = identity.atp_did;
  if (atp_did) {
    // Publications, leaflet_contributors, and publication_contributors are
    // folded into the main identities query above as embedded resources
    // (via the *_contributor_did_fkey / *_identity_did_fkey FKs to
    // identities.atp_did). The profile stays separate because it's an
    // external Redis/bsky profile cache, not a DB table.
    const profiles = await getProfilesFromCache([atp_did]);
    // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces,
    // then filter to only publications created by Leaflet
    const publications = deduplicateByUri(rawPublications || []).filter(
      isLeafletManagedPublication,
    );
    const contributor_leaflets = (contributorLeafletRows ?? [])
      .filter(
        (
          r,
        ): r is typeof r & {
          permission_tokens: NonNullable<typeof r.permission_tokens>;
        } => !!r.permission_tokens,
      )
      .map((r) => ({
        ...r,
        permission_tokens: withDocumentRecords(r.permission_tokens),
      }));
    const rawContributorPubs = (contributorPubRows ?? [])
      .map((r) => r.publications)
      .filter((p): p is NonNullable<typeof p> => !!p);
    const contributor_publications = deduplicateByUri(
      rawContributorPubs,
    ).filter(isLeafletManagedPublication);
    return {
      ...identity,
      // Orders identity snapshots by when they were fetched, so the client
      // provider can drop a stale seed (e.g. from a nav payload prefetched
      // before a client-side revalidation) instead of overwriting newer data.
      fetched_at: Date.now(),
      bsky_profiles: bskyProfileFromCache(profiles.get(atp_did) ?? null),
      permission_token_on_homepage,
      publications,
      contributor_publications,
      contributor_leaflets,
      entitlements,
      subscription: subscription ?? null,
      connectedAccount: processConnectedAccount(connectedAccount),
    };
  }

  return {
    ...identity,
    fetched_at: Date.now(),
    bsky_profiles: null,
    permission_token_on_homepage,
    publications: [],
    contributor_publications: [],
    contributor_leaflets: [],
    entitlements,
    subscription: subscription ?? null,
    connectedAccount: processConnectedAccount(connectedAccount),
  };
}
