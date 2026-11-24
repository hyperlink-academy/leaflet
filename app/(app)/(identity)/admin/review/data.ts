import type { Queryable, Reason } from "src/review/types";
import { REASON_LABELS } from "src/review/reasons";

export const PAGE_SIZE = 20;
const CLUSTER_LIMIT = 40;
const CLUSTER_EXAMPLES = 3;

export type View = "review" | "spam" | "blocked";

export type Post = { rkey: string; title: string | null; links: string[] };

export type Summary = {
  accounts: number;
  review: number;
  spam: number;
  blocked: number;
  // Waiting for the policy to finish, not for a person.
  unjudged: number;
  lastRun: string | null;
};

export type Week = {
  week: string;
  current: boolean;
  total: number;
  spam: number;
  review: number;
};

export type Cluster = {
  domain: string;
  // Exactly the accounts blockSite would newly block.
  accounts: number;
  alreadyBlocked: number;
  documents: number;
  firstSeen: string | null;
  lastSeen: string | null;
  thisWeek: number;
  examples: { id: string; handle: string | null; post: Post | null }[];
};

export type Signals = Record<
  string,
  { value: unknown; evidence: Record<string, unknown> | null } | undefined
>;

export type Account = {
  id: string;
  label: {
    handle?: string | null;
    displayName?: string | null;
    publications?: { name: string; url: string | null }[];
  };
  stats: { documents?: number; standalone?: number; followers?: number };
  firstSeen: string | null;
  proposedStatus: string;
  proposedBy: string | null;
  humanLabel: string | null;
  blocked: boolean;
  blockedOn: string | null;
  posts: Post[];
  reasons: Reason[];
  signals: Signals;
};

export type Health = {
  byRule: { status: string; rule: string | null; accounts: number }[];
  labels: { label: string; status: string; accounts: number }[];
  misses: {
    id: string;
    handle: string | null;
    label: string;
    status: string;
    rule: string | null;
  }[];
  days: {
    day: string;
    cleared: number;
    review: number;
    spam: number;
    blocks: number;
    unblocks: number;
  }[];
};

export type ReviewData = {
  summary: Summary;
  weeks: Week[];
  clusters: Cluster[];
  view: View;
  // The reason the queue is narrowed to, and how many accounts in this view
  // carry each reason.
  reason: string | null;
  reasonCounts: { code: string; accounts: number }[];
  search: string;
  page: number;
  pages: number;
  matching: number;
  accounts: Account[];
  // Handles of accounts named in signal evidence, by DID.
  handles: Record<string, string>;
  health: Health;
};

// Record keys are time-ordered ids, so sorting by them is newest first, and
// covers posts that have links on file but no row in `documents`.
const newestPosts = (account: string, limit: number) => `
  select coalesce(jsonb_agg(p), '[]'::jsonb) from (
    select split_part(u.uri, '/', 5) as rkey, d.data->>'title' as title,
      (select coalesce(jsonb_agg(l.url order by l.url), '[]'::jsonb)
       from document_links l where l.document = u.uri) as links
    from (
      select uri from documents where identity_did = ${account}
      union
      select document from document_links where author_did = ${account}
    ) u
    left join documents d on d.uri = u.uri
    order by split_part(u.uri, '/', 5) collate "C" desc
    limit ${limit}
  ) p`;

const VIEWS: Record<View, { where: string; order: string }> = {
  review: {
    where: "s.proposed_status = 'needs_review' and s.enforced_status is null",
    order: "s.first_seen desc nulls last",
  },
  spam: {
    where: "s.proposed_status = 'spam' and s.enforced_status is null",
    order: "s.first_seen desc nulls last",
  },
  blocked: {
    where: "s.enforced_status is not null",
    order: "s.enforced_at desc nulls last",
  },
};

export async function loadReview(
  db: Queryable,
  opts: { view: View; search: string; page: number; reason?: string },
): Promise<ReviewData> {
  let rows = async <T>(text: string, params: unknown[] = []) =>
    (await db.query(text, params)).rows as T[];

  let search = opts.search.trim().replace(/^@/, "");
  let page = Math.max(1, opts.page);
  let filter = search
    ? {
        where: "(s.label->>'handle' ilike '%' || $3 || '%' or s.id = $3)",
        order: "s.first_seen desc nulls last",
      }
    : VIEWS[opts.view];
  // Only a known code reaches the SQL text.
  let reason =
    !search && opts.reason && opts.reason in REASON_LABELS ? opts.reason : null;
  let where = reason
    ? `${filter.where} and s.reasons @> '[{"code": "${reason}"}]'::jsonb`
    : filter.where;

  let [
    [summary],
    weeks,
    clusterRows,
    accountRows,
    byRule,
    labels,
    misses,
    decisionDays,
    humanDays,
  ] = await Promise.all([
    rows<Summary>(
      `select count(*)::int as accounts,
         count(*) filter (where ${VIEWS.review.where})::int as review,
         count(*) filter (where ${VIEWS.spam.where})::int as spam,
         count(*) filter (where ${VIEWS.blocked.where})::int as blocked,
         count(*) filter (where s.proposed_status = 'unjudged')::int as unjudged,
         to_char(max(s.evaluated_at), 'YYYY-MM-DD HH24:MI') as "lastRun"
       from review_subjects s where s.kind = 'account'`,
    ),
    rows<Week>(
      `select to_char(w, 'Mon FMDD') as week,
         w = date_trunc('week', now()) as current,
         count(*)::int as total,
         count(*) filter (where proposed_status = 'spam')::int as spam,
         count(*) filter (where proposed_status = 'needs_review')::int as review
       from (
         select date_trunc('week', first_seen) as w, proposed_status
         from review_subjects
         where kind = 'account'
           and first_seen >= date_trunc('week', now()) - interval '7 weeks'
       ) x group by w order by w desc`,
    ),
    // Membership mirrors blockSite in actions/admin/reviewBlock.ts, so the
    // count on a block button is the number of accounts the block hits.
    rows<Omit<Cluster, "examples"> & { exampleIds: string[] }>(
      `with members as (
         select distinct r->>'site' as domain, s.id, s.first_seen,
           s.enforced_status is not null as blocked,
           coalesce((s.stats->>'documents')::int, 0) as documents
         from review_subjects s, jsonb_array_elements(s.reasons) r
         where s.kind = 'account' and s.proposed_status in ('spam', 'needs_review')
           and r->>'code' in ('link_farm', 'known_spam_site')
           and r->>'site' is not null
       )
       select domain,
         count(*) filter (where not blocked)::int as accounts,
         count(*) filter (where blocked)::int as "alreadyBlocked",
         coalesce(sum(documents) filter (where not blocked), 0)::int as documents,
         to_char(min(first_seen), 'Mon FMDD') as "firstSeen",
         to_char(max(first_seen), 'Mon FMDD') as "lastSeen",
         count(*) filter (where not blocked
           and first_seen > now() - interval '7 days')::int as "thisWeek",
         (array_agg(id order by first_seen desc nulls last)
           filter (where not blocked))[1:${CLUSTER_EXAMPLES}] as "exampleIds"
       from members group by domain
       having count(*) >= 2 and count(*) filter (where not blocked) >= 1
       order by 2 desc, 1 limit ${CLUSTER_LIMIT}`,
    ),
    // The page of accounts is chosen first so the per-account lookups run
    // for one page of rows, not for every match.
    rows<Account & { matching: number }>(
      `with page as (
         select s.*, count(*) over ()::int as matching,
           row_number() over (order by ${filter.order}, s.id) as position
         from review_subjects s
         where s.kind = 'account' and ${where}
         order by position limit $1 offset $2
       )
       select s.id, s.label, s.stats, s.matching,
         to_char(s.first_seen, 'YYYY-MM-DD') as "firstSeen",
         s.proposed_status as "proposedStatus", s.proposed_by as "proposedBy",
         s.human_label as "humanLabel", s.reasons,
         s.enforced_status is not null as blocked,
         to_char(s.enforced_at, 'YYYY-MM-DD') as "blockedOn",
         (${newestPosts("s.id", 3)}) as posts,
         (select coalesce(jsonb_object_agg(e.name,
            jsonb_build_object('value', e.value, 'evidence', e.evidence)), '{}'::jsonb)
          from (
            select distinct on (name) name, value, evidence from review_events
            where kind = 'account' and subject_id = s.id and type = 'signal'
              -- "name:model" rows are one-off model comparisons, not policy inputs.
              and position(':' in name) = 0
            order by name, at desc
          ) e) as signals
       from page s order by s.position`,
      search
        ? [PAGE_SIZE, (page - 1) * PAGE_SIZE, search]
        : [PAGE_SIZE, (page - 1) * PAGE_SIZE],
    ),
    rows<Health["byRule"][number]>(
      `select proposed_status as status, proposed_by as rule, count(*)::int as accounts
       from review_subjects where kind = 'account'
       group by 1, 2 order by 3 desc`,
    ),
    rows<Health["labels"][number]>(
      `select human_label as label, proposed_status as status, count(*)::int as accounts
       from review_subjects where kind = 'account' and human_label is not null
       group by 1, 2 order by 1 desc, 3 desc`,
    ),
    rows<Health["misses"][number]>(
      `select id, label->>'handle' as handle, human_label as label,
         proposed_status as status, proposed_by as rule
       from review_subjects
       where kind = 'account' and (
         (human_label = 'spam' and proposed_status = 'cleared')
         or (human_label = 'legit' and proposed_status = 'spam'))
       order by first_seen desc nulls last limit 20`,
    ),
    // An account evaluated several times in a day counts once, by its last
    // proposal that day.
    rows<Omit<Health["days"][number], "blocks" | "unblocks">>(
      `select to_char(day, 'YYYY-MM-DD') as day,
         count(*) filter (where status = 'cleared')::int as cleared,
         count(*) filter (where status in ('needs_review', 'pending', 'held'))::int as review,
         count(*) filter (where status = 'spam')::int as spam
       from (
         select distinct on (date_trunc('day', at), subject_id)
           date_trunc('day', at) as day, value #>> '{}' as status
         from review_events
         where type = 'decision' and at > now() - interval '30 days'
         order by date_trunc('day', at), subject_id, at desc
       ) d group by day order by day desc`,
    ),
    rows<{ day: string; blocks: number; unblocks: number }>(
      `select to_char(date_trunc('day', at), 'YYYY-MM-DD') as day,
         count(*) filter (where name = 'block')::int as blocks,
         count(*) filter (where name = 'unblock')::int as unblocks
       from review_events
       where type = 'human' and at > now() - interval '30 days'
       group by 1`,
    ),
  ]);

  let accounts: Account[] = accountRows.map(({ matching, ...a }) => a);
  let matching = accountRows[0]?.matching ?? 0;

  let partnerIds = accounts.flatMap((a) =>
    a.reasons.flatMap((r) => r.account ?? []),
  );
  let [exampleRows, partnerRows, reasonCounts] = await Promise.all([
    rows<{ id: string; handle: string | null; posts: Post[] }>(
      `select s.id, s.label->>'handle' as handle,
         (${newestPosts("s.id", 1)}) as posts
       from review_subjects s where s.kind = 'account' and s.id = any($1)`,
      [clusterRows.flatMap((c) => c.exampleIds)],
    ),
    rows<{ id: string; handle: string }>(
      `select id, label->>'handle' as handle from review_subjects
       where kind = 'account' and id = any($1) and label->>'handle' is not null`,
      [partnerIds],
    ),
    rows<{ code: string; accounts: number }>(
      `select r->>'code' as code, count(*)::int as accounts
       from review_subjects s, jsonb_array_elements(s.reasons) r
       where s.kind = 'account' and ${VIEWS[opts.view].where}
       group by 1 order by 2 desc`,
    ),
  ]);
  let examples = new Map(exampleRows.map((e) => [e.id, e]));

  let days = new Map(
    decisionDays.map((d) => [d.day, { ...d, blocks: 0, unblocks: 0 }]),
  );
  for (let h of humanDays)
    days.set(h.day, {
      ...(days.get(h.day) ?? {
        day: h.day,
        cleared: 0,
        review: 0,
        spam: 0,
      }),
      blocks: h.blocks,
      unblocks: h.unblocks,
    });

  return {
    summary,
    weeks,
    clusters: clusterRows.map(({ exampleIds, ...c }) => ({
      ...c,
      examples: exampleIds.map((id) => {
        let e = examples.get(id);
        return { id, handle: e?.handle ?? null, post: e?.posts[0] ?? null };
      }),
    })),
    view: opts.view,
    reason,
    reasonCounts,
    search,
    page,
    pages: Math.max(1, Math.ceil(matching / PAGE_SIZE)),
    matching,
    accounts,
    handles: Object.fromEntries(partnerRows.map((p) => [p.id, p.handle])),
    health: {
      byRule,
      labels,
      misses,
      days: [...days.values()].sort((a, b) => b.day.localeCompare(a.day)),
    },
  };
}
