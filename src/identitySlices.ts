import { supabaseServerClient } from "supabase/serverClient";
import { deduplicateByUri } from "src/utils/deduplicateRecords";
import { isLeafletManagedPublication } from "src/utils/isLeafletManagedPublication";
import { getProfilesFromCache } from "src/identity";
import { resolveAuthToken } from "src/auth";
import {
  getCached,
  invalidateCached,
  writeCached,
  type IdentityCacheStore,
} from "src/identityCache";
import {
  bskyProfileFromCache,
  ENTITLEMENT_EMBEDS,
  getValidAuthToken,
  keyEntitlements,
  processConnectedAccount,
  SUBSCRIPTION_STATE_EMBEDS,
} from "src/identityPayload";

// The identity payload is assembled from slices grouped by who writes them and
// how often they change:
//
//   session        identities row + unread count            fresh PK lookup, never cached
//   leaflets       home + contributor leaflets               identity:leaflets:v1:<id>
//   publications   owned + contributor publications          identity:publications:v1:<id>
//   domains        custom domains, assignments, routes       identity:domains:v1:<id>
//   subscriptions  atproto/email subscriptions, memberships  identity:subscriptions:v1:<id>
//   billing        entitlements, Pro subscription, Connect   identity:billing:v1:<id>
//
// Cached slices live in Redis keyed by identity id, not session token, so any
// writer that knows the id — server actions, webhooks, admin tools — calls
// invalidateIdentitySlices(id, [...]) for exactly what it changed; writers that
// only hold the session cookie use invalidateSessionIdentitySlices. Deliberately
// not a "use server" module: exporting an async fn from one would publish it as
// a client-callable endpoint.

export const IDENTITY_SLICES = [
  "leaflets",
  "publications",
  "domains",
  "subscriptions",
  "billing",
] as const;
export type IdentitySlice = (typeof IDENTITY_SLICES)[number];

export function identitySliceKey(slice: IdentitySlice, identityId: string) {
  return `identity:${slice}:v1:${identityId}`;
}

export async function invalidateIdentitySlices(
  identityId: string,
  slices: readonly IdentitySlice[],
  store?: IdentityCacheStore | null,
) {
  await invalidateCached(
    slices.map((slice) => identitySliceKey(slice, identityId)),
    store,
  );
}

export async function invalidateSessionIdentitySlices(
  slices: readonly IdentitySlice[],
) {
  const token = await getValidAuthToken().catch(() => null);
  const session = await resolveAuthToken(token ?? undefined);
  if (session) await invalidateIdentitySlices(session.identity.id, slices);
}

// For writers that act on a DID (publishing as `actorDid`, contributor changes
// to someone else's account) rather than on the session.
export async function invalidateIdentitySlicesForDid(
  did: string,
  slices: readonly IdentitySlice[],
) {
  const { data } = await supabaseServerClient
    .from("identities")
    .select("id")
    .eq("atp_did", did)
    .maybeSingle();
  if (data) await invalidateIdentitySlices(data.id, slices);
}

async function fetchSessionIdentity(auth_token: string) {
  const { data } = await supabaseServerClient
    .from("email_auth_tokens")
    .select("identities(*, notifications(count))")
    .eq("identities.notifications.read", false)
    .eq("id", auth_token)
    .eq("confirmed", true)
    .single();
  return data?.identities ?? null;
}

// Only the published-record fields getDocumentURL needs. The whole record is
// the largest thing in this payload — every page of every published leaflet on
// the home page — and nothing the identity feeds reads the rest of it.
const DOCUMENT_URL_FIELDS = `uri, indexed_at, type:data->>"$type", path:data->>path, site:data->>site, publishedAt:data->>publishedAt, publication:data->>publication, author:data->>author`;

const LEAFLET_TOKEN_FIELDS = `id, root_entity, title, description,
  permission_token_rights(*),
  leaflets_to_documents(*, documents(${DOCUMENT_URL_FIELDS})),
  leaflets_in_publications(*, documents(${DOCUMENT_URL_FIELDS}), publications(uri, record))`;

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

async function fetchLeaflets(identityId: string) {
  const { data } = await supabaseServerClient
    .from("identities")
    .select(
      `permission_token_on_homepage(
        archived,
        created_at,
        permission_tokens!inner(${LEAFLET_TOKEN_FIELDS})
      ),
      leaflet_contributors!leaflet_contributors_contributor_did_fkey(
        created_at,
        permission_tokens!leaflet_contributors_leaflet_fkey!inner(${LEAFLET_TOKEN_FIELDS})
      )`,
    )
    .eq("id", identityId)
    .single();
  return {
    permission_token_on_homepage: (
      data?.permission_token_on_homepage ?? []
    ).map((r) => ({
      ...r,
      permission_tokens: withDocumentRecords(r.permission_tokens),
    })),
    contributor_leaflets: (data?.leaflet_contributors ?? [])
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
      })),
  };
}

async function fetchPublications(identityId: string) {
  const { data } = await supabaseServerClient
    .from("identities")
    .select(
      `publications!publications_identity_did_fkey(*),
      publication_contributors!publication_contributors_contributor_did_fkey(
        created_at,
        publications!publication_contributors_publication_uri_fkey!inner(*)
      )`,
    )
    .eq("id", identityId)
    .eq("publication_contributors.confirmed", true)
    .single();
  // Records may exist under both pub.leaflet and site.standard namespaces, and
  // only publications created by Leaflet belong in the dashboard.
  const publications = deduplicateByUri(data?.publications ?? []).filter(
    isLeafletManagedPublication,
  );
  const contributor_publications = deduplicateByUri(
    (data?.publication_contributors ?? [])
      .map((r) => r.publications)
      .filter((p): p is NonNullable<typeof p> => !!p),
  ).filter(isLeafletManagedPublication);
  return { publications, contributor_publications };
}

async function fetchDomains(identityId: string) {
  const { data } = await supabaseServerClient
    .from("custom_domains")
    .select(
      `*,
      publication_domains(*, publications(name)),
      custom_domain_routes(*, leaflet:permission_tokens!custom_domain_routes_edit_permission_token_fkey(title, leaflets_in_publications(title), leaflets_to_documents(title)))`,
    )
    .eq("identity_id", identityId);
  return data ?? [];
}

async function fetchSubscriptions(identityId: string) {
  const { data } = await supabaseServerClient
    .from("identities")
    .select(SUBSCRIPTION_STATE_EMBEDS)
    .eq("id", identityId)
    .single();
  return {
    publication_subscriptions: data?.publication_subscriptions ?? [],
    publication_email_subscribers: data?.publication_email_subscribers ?? [],
    publication_memberships: data?.publication_memberships ?? [],
  };
}

async function fetchBilling(identityId: string) {
  const { data } = await supabaseServerClient
    .from("identities")
    .select(ENTITLEMENT_EMBEDS)
    .eq("id", identityId)
    .single();
  return {
    entitlements: keyEntitlements(data?.user_entitlements),
    subscription: data?.user_subscriptions ?? null,
    connectedAccount: processConnectedAccount(data?.stripe_connected_accounts),
  };
}

async function readSlice<T>(
  slice: IdentitySlice,
  identityId: string,
  fetchFresh: () => Promise<T>,
  fresh: boolean,
): Promise<T> {
  const key = identitySliceKey(slice, identityId);
  if (!fresh) return getCached(key, fetchFresh);
  const value = await fetchFresh();
  await writeCached(key, value);
  return value;
}

// `fresh` bypasses every slice cache and rewrites it: the client provider's
// revalidation runs right after a mutation and must be authoritative.
export async function loadIdentity(
  auth_token: string,
  opts: { fresh: boolean },
) {
  const session = await fetchSessionIdentity(auth_token);
  if (!session) return null;
  const id = session.id;
  const [profiles, leaflets, publications, domains, subscriptions, billing] =
    await Promise.all([
      session.atp_did ? getProfilesFromCache([session.atp_did]) : null,
      readSlice("leaflets", id, () => fetchLeaflets(id), opts.fresh),
      readSlice("publications", id, () => fetchPublications(id), opts.fresh),
      readSlice("domains", id, () => fetchDomains(id), opts.fresh),
      readSlice("subscriptions", id, () => fetchSubscriptions(id), opts.fresh),
      readSlice("billing", id, () => fetchBilling(id), opts.fresh),
    ]);
  return {
    ...session,
    // Orders identity snapshots by when they were fetched, so the client
    // provider can drop a stale seed (e.g. from a nav payload prefetched
    // before a client-side revalidation) instead of overwriting newer data.
    fetched_at: Date.now(),
    bsky_profiles: bskyProfileFromCache(
      (session.atp_did && profiles?.get(session.atp_did)) || null,
    ),
    ...leaflets,
    ...publications,
    custom_domains: domains,
    ...subscriptions,
    ...billing,
  };
}
