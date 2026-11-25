import { toReviewDocument } from "./content";
import type {
  AccountBundle,
  Queryable,
  ReviewProfile,
  ReviewPublication,
} from "./types";

// A publication made in Leaflet, as opposed to a third-party standard.site
// publication the appview only indexes. Same markers as appview/index.ts.
const MANAGED_PUBLICATION = `(p.draft_leaflet is not null or exists (
  select 1 from leaflets_in_publications lp where lp.publication = p.uri))`;

// Every account with at least one Leaflet-made document.
export async function listAccounts(db: Queryable): Promise<string[]> {
  let { rows } = await db.query(
    `select d.identity_did as did
     from leaflets_to_documents l join documents d on d.uri = l.document
     where d.identity_did is not null
     union
     select d.identity_did
     from publications p
     join documents_in_publications dp on dp.publication = p.uri
     join documents d on d.uri = dp.document
     where ${MANAGED_PUBLICATION} and d.identity_did is not null`,
  );
  return rows.map((r) => r.did as string).sort();
}

function describePublication(row: {
  uri: string;
  name: string;
  record: any;
}): ReviewPublication {
  let record = row.record ?? {};
  let url =
    typeof record.url === "string"
      ? record.url
      : typeof record.base_path === "string"
        ? `https://${record.base_path}`
        : null;
  return {
    uri: row.uri,
    name: row.name,
    description:
      typeof record.description === "string" ? record.description : null,
    url,
  };
}

// Accounts without their Bluesky profile; see fetchProfiles.
export async function loadAccounts(
  db: Queryable,
  dids: string[],
): Promise<AccountBundle[]> {
  let [docs, pubs, labels] = await Promise.all([
    db.query(
      `select d.uri, d.identity_did, d.data, d.sort_date, dp.publication
       from documents d
       left join documents_in_publications dp on dp.document = d.uri
       where d.identity_did = any($1)
         and (exists (select 1 from leaflets_to_documents l where l.document = d.uri)
           or exists (select 1 from publications p
                      where p.uri = dp.publication and ${MANAGED_PUBLICATION}))`,
      [dids],
    ),
    db.query(
      `select p.uri, p.name, p.record, p.identity_did from publications p
       where p.identity_did = any($1) and ${MANAGED_PUBLICATION}`,
      [dids],
    ),
    // Decisions admins made in the publication queue this system replaced.
    // The table is no longer written; these rows are its labels.
    db.query(
      `select p.identity_did, bool_or(r.spam) as spam
       from publication_reviews r join publications p on p.uri = r.publication
       where r.reviewed_by is not null and p.identity_did = any($1)
       group by p.identity_did`,
      [dids],
    ),
  ]);

  let accounts = new Map<string, AccountBundle>(
    dids.map((did) => [
      did,
      { did, profile: null, publications: [], documents: [], humanLabel: null },
    ]),
  );
  // A document can be indexed under both lexicon namespaces; keep one.
  let seen = new Set<string>();
  let ordered = [...docs.rows].sort(
    (a, b) =>
      Number(b.uri.includes("/site.standard.document/")) -
      Number(a.uri.includes("/site.standard.document/")),
  );
  for (let row of ordered) {
    let key = `${row.identity_did}/${row.uri.split("/").pop()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    accounts.get(row.identity_did)?.documents.push(toReviewDocument(row));
  }
  for (let row of pubs.rows)
    accounts.get(row.identity_did)?.publications.push(describePublication(row));
  for (let row of labels.rows) {
    let account = accounts.get(row.identity_did);
    if (account) account.humanLabel = row.spam ? "spam" : "legit";
  }
  return [...accounts.values()];
}

const PROFILE_BATCH = 25;

// Bluesky profiles from the public AppView. A did missing from the result had
// no profile to return (deactivated or taken down), or its batch failed.
export async function fetchProfiles(
  dids: string[],
): Promise<Map<string, ReviewProfile>> {
  let out = new Map<string, ReviewProfile>();
  for (let i = 0; i < dids.length; i += PROFILE_BATCH) {
    let batch = dids.slice(i, i + PROFILE_BATCH);
    let url =
      "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?" +
      batch.map((d) => `actors=${encodeURIComponent(d)}`).join("&");
    try {
      let res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`getProfiles ${res.status}`);
      let body = (await res.json()) as { profiles: any[] };
      for (let p of body.profiles)
        out.set(p.did, {
          handle: p.handle ?? null,
          displayName: p.displayName || null,
          bio: p.description || null,
          createdAt: p.createdAt ?? null,
          followers: p.followersCount ?? 0,
          follows: p.followsCount ?? 0,
          posts: p.postsCount ?? 0,
        });
    } catch (e) {
      console.error("[review] profile batch failed:", e);
    }
  }
  return out;
}
