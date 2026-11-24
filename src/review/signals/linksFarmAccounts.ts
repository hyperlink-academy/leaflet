import type { Queryable, Signal } from "../types";

// A domain dominates an account when at least this share of the account's
// documents link to it, and at least this many do.
const DOMINANT_SHARE = 0.5;
const DOMINANT_MIN_DOCUMENTS = 2;

// Farms are built from accounts nobody follows. Counting only those keeps a
// site that several real people write about from looking like one.
const THROWAWAY = "coalesce((s.stats->>'followers')::int, 0) < 5";

// The account's most-linked domain, if it dominates, and the other accounts
// it dominates too. `where` narrows which other accounts count.
export async function dominantDomainPeers(
  db: Queryable,
  did: string,
  documents: number,
  where = THROWAWAY,
): Promise<{ domain: string | null; peers: string[] }> {
  let { rows } = await db.query(
    `select domain, count(distinct document)::int as n from document_links
     where author_did = $1 group by domain order by n desc, domain limit 1`,
    [did],
  );
  let top = rows[0];
  if (
    !top ||
    top.n < DOMINANT_MIN_DOCUMENTS ||
    top.n < DOMINANT_SHARE * documents
  )
    return { domain: null, peers: [] };
  let peers = await db.query(
    `select l.author_did
     from document_links l
     join review_subjects s on s.kind = 'account' and s.id = l.author_did
     where l.domain = $1 and l.author_did <> $2 and ${where}
     group by l.author_did, s.stats
     having count(distinct l.document) >= $4
        and count(distinct l.document) >= $3::float8 * (s.stats->>'documents')::int
     order by l.author_did`,
    [top.domain, did, DOMINANT_SHARE, DOMINANT_MIN_DOCUMENTS],
  );
  return { domain: top.domain, peers: peers.rows.map((r) => r.author_did) };
}

// How many other throwaway accounts are devoted to the same site this one is
// devoted to. A writer linking their own site in every post has no such peers; a farm
// of throwaway accounts all promoting one site has dozens.
export const linksFarmAccounts: Signal = {
  id: "links.farm_accounts",
  version: 1,
  cost: "cheap",
  async compute(account, ctx) {
    let { domain, peers } = await dominantDomainPeers(
      ctx.db,
      account.did,
      account.documents.length,
    );
    return {
      value: peers.length,
      evidence: { domain, peers: peers.slice(0, 10) },
    };
  },
};
