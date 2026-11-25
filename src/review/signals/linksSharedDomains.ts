import type { Signal } from "../types";

// A domain linked by more accounts than this is a popular site, not a roster.
const RARE_DOMAIN_MAX_ACCOUNTS = 25;

// The most link domains this account shares with any single other account,
// counting only domains few accounts link to. Unrelated writers rarely share
// more than one; accounts run by one operator share its whole client list.
export const linksSharedDomains: Signal = {
  id: "links.shared_domains",
  version: 1,
  cost: "cheap",
  async compute(account, ctx) {
    let { rows } = await ctx.db.query(
      `with mine as (
         select distinct domain from document_links where author_did = $1
       ), rare as (
         select l.domain from document_links l join mine using (domain)
         group by l.domain
         having count(distinct l.author_did) between 2 and $2
       )
       select l.author_did, array_agg(distinct l.domain) as domains
       from document_links l join rare using (domain)
       where l.author_did <> $1
       group by l.author_did
       order by count(distinct l.domain) desc, l.author_did
       limit 8`,
      [account.did, RARE_DOMAIN_MAX_ACCOUNTS],
    );
    let partners = rows.map((r) => ({
      did: r.author_did as string,
      domains: (r.domains as string[]).slice(0, 12),
      shared: (r.domains as string[]).length,
    }));
    return {
      value: partners[0]?.shared ?? 0,
      evidence: { partners },
    };
  },
};
