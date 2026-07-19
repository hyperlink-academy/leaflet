---
name: supabase-query-plans
description: Avoid the PostgREST query shape that causes full-table scans — ordering a table by its own column with a limit while an !inner embed filters the rows. Use when writing or modifying any supabase-js query that combines embeds with .order()/.limit(), when adding feed/list/newest-N queries, or when investigating a slow query or a full scan in query performance data.
user-invocable: true
---

# Supabase query plans: the order + limit + embed-filter trap

This repo has shipped the same full-table-scan bug three times (tag page,
reader feed, publication feeds — see migrations `20260303000000`,
`20260305000000`, `20260702000000`, `20260719000000`). The query looks
obviously fine, dev tables are too small to notice, and production then scans
the entire `documents` table on a hot path. Read this before writing any
supabase-js query that orders and limits.

## The trap

```ts
supabaseServerClient
  .from("documents")
  .select(`uri, data, sort_date, documents_in_publications!inner(publication)`)
  .eq("documents_in_publications.publication", pubUri)
  .order("sort_date", { ascending: false })
  .limit(50);
```

PostgREST compiles an embed filter into a **LATERAL join that references the
outer table** (`WHERE dip.document = documents.uri`). A lateral join pins the
join direction: Postgres *must* start from `documents`. The only way to
satisfy `ORDER BY sort_date LIMIT 50` from that side is to walk
`documents_sort_date_idx` newest-first across the whole table, running the
embed subquery per row, until 50 rows match. When the filter is selective — a
small publication, a user following few or quiet accounts — the limit never
short-circuits and **every request scans the entire table**. This is
structural: no index or ANALYZE can fix it, because the planner has no other
plan available.

The danger predicate: `.from(T)` + `.order()` on T's own column + `.limit()`
+ a row-restricting embed (`!inner` / embed-path filter). CI enforces exactly
this via `node scripts/check-supabase-query-plans.mjs`.

## Safe shapes, in order of preference

1. **Filter on the from-table's own indexed columns.** Plain filters compile
   to WHERE clauses on the outer table; order + limit then rides the index
   normally. Fine to combine with embeds that only *decorate* rows.

2. **Start the query from the join/membership table.** If the selective
   filter lives on `documents_in_publications`, query that table and embed
   `documents(...)`. Work becomes proportional to the matching membership
   rows. Only works when you don't need the DB to order by the embedded
   table's column with a limit.

3. **Newest-N across a join → fenced SQL function.** When you need "the
   newest N documents matching a join" (feeds, tag pages, profiles), write an
   RPC in a migration:

   ```sql
   CREATE OR REPLACE FUNCTION get_xxx(p_key text, p_limit int DEFAULT 50)
   RETURNS TABLE (uri text, data jsonb, sort_date timestamptz) AS $$
       WITH keys AS MATERIALIZED (
           SELECT jt.document FROM "public"."join_table" jt
           WHERE jt.key = p_key            -- must be indexed
       )
       SELECT d.uri, d.data, d.sort_date
       FROM "public"."documents" d
       JOIN keys k ON k.document = d.uri
       ORDER BY d.sort_date DESC NULLS LAST, d.uri DESC
       LIMIT p_limit;
   $$ LANGUAGE sql STABLE SET enable_seqscan = off;
   ```

   - `MATERIALIZED` is an optimization fence: the plan must start from the
     join table's index, never the sort_date walk.
   - `enable_seqscan = off` (a cost penalty, scoped to the function) keeps
     the join as pkey probes instead of hashing the whole outer table. Every
     index the fenced plan needs must exist — verify before shipping.
   - `NULLS LAST` matches the app convention (null dates sort as oldest) and
     keeps row 0 usable as Last-Modified.
   - Costs of the fence: the function does O(matching join rows) work per
     call (no limit pushdown into the CTE), SQL functions with SET aren't
     inlined so they replan per call, and misestimates inside the fence are
     harmless because the plan shape is fixed. If a join key can match very
     many rows (100k+), this pattern isn't enough — denormalize the sort
     column onto the join table with a composite index instead.
   - Existing examples to copy: `get_publication_feed_docs`,
     `get_tag_page_document_uris`, `get_profile_posts`, `get_reader_feed`.
   - Hand-add the function's types to `supabase/database.types.ts` (mirror
     the existing `Functions` entries). Migrations apply via the deploy
     workflow's `deploy-supabase` job; if the caller must survive the window
     before that job runs, add a fallback query (see `getDocumentsByTag.ts`).

## Verifying a query's plan

Dev-sized tables hide the trap, and `EXPLAIN` on the supabase-js chain isn't
possible — you must test the shape PostgREST generates. Spin up a throwaway
Postgres (CI/sandbox has PG16: `initdb` + `pg_ctl` as an unprivileged user),
create the real tables/indexes from `supabase/migrations/`, insert a few
hundred thousand synthetic rows with a *skewed* distribution (huge and tiny
publications), and `EXPLAIN ANALYZE` the faithful lateral shape:

```sql
SELECT d.* FROM documents d
INNER JOIN LATERAL (
  SELECT 1 FROM documents_in_publications dip
  WHERE dip.document = d.uri AND dip.publication = 'small-pub'
) j ON true
ORDER BY d.sort_date DESC LIMIT 50;
```

Red flags: `Index Scan using documents_sort_date_idx` with `loops=<table
size>` on the inner probe, or `Rows Removed by Filter` in the hundreds of
thousands. Test the *worst* key (smallest/oldest publication, a key with zero
matches), not the average one.

## The lint and `plan-checked:` suppressions

`node scripts/check-supabase-query-plans.mjs` (runs in CI before deploy)
flags the danger predicate. If a flagged query is genuinely safe, add a
comment containing `plan-checked:` within the ten lines above `.from(`,
stating the **data-distribution argument** (e.g. "global feed — the filter
excludes a tiny minority of recent rows, so the limit short-circuits").
"Seems fast" is not an argument. `plan-checked: KNOWN DEBT — ...` marks
pre-existing offenders awaiting a fenced rewrite; never add new debt.
